<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\LoomResource;
use App\Models\Fabric;
use App\Models\GenericCode;
use App\Models\Loom;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LoomController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $this->clampPerPage($request, 10, 100);
        $looms = Loom::query()
            ->with(['fabric:id,sl_number,yarn_order_id'])
            ->when($request->search, fn ($q) => $q->where('loom_number', 'like', "%{$request->search}%")
                ->orWhere('location', 'like', "%{$request->search}%"))
            ->orderBy('loom_number')
            ->paginate($perPage);

        return $this->paginatedResponse(
            $looms,
            LoomResource::collection($looms->items())->resolve()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'loom_number' => 'required|string|max:50|unique:looms,loom_number',
            'location' => 'nullable|string|max:255',
            'status' => 'nullable|in:Active,Inactive',
            'inactive_reason' => 'nullable|string|max:2000',
            'yarn_order_id' => 'nullable|exists:yarn_orders,id',
            'fabric_id' => 'nullable|exists:fabrics,id',
        ]);

        $fid = ! empty($validated['fabric_id']) ? (int) $validated['fabric_id'] : null;
        if (! $this->fabricFitsYarnOrder($fid, $validated['yarn_order_id'] ?? null)) {
            return response()->json(['message' => 'Fabric (SL) must belong to the selected yarn order.'], 422);
        }

        $validated['status'] = $validated['status'] ?? 'Active';
        if ($validated['status'] === 'Inactive') {
            $reason = trim((string) ($validated['inactive_reason'] ?? ''));
            if ($reason === '') {
                return response()->json([
                    'message' => 'A reason is required when status is Inactive.',
                    'errors' => ['inactive_reason' => ['Please provide a reason for marking this loom inactive.']],
                ], 422);
            }
            $validated['inactive_reason'] = $reason;
        } else {
            $validated['inactive_reason'] = null;
        }

        $loom = Loom::create($validated);
        $loom->load('fabric:id,sl_number,yarn_order_id');

        return response()->json(['data' => new LoomResource($loom)], 201);
    }

    public function show(Loom $loom): JsonResponse
    {
        $loom->load('fabric:id,sl_number,yarn_order_id');

        return response()->json(['data' => new LoomResource($loom)]);
    }

    public function update(Request $request, Loom $loom): JsonResponse
    {
        $validated = $request->validate([
            'loom_number' => 'sometimes|string|max:50|unique:looms,loom_number,'.$loom->id,
            'location' => 'nullable|string|max:255',
            'status' => GenericCode::validationRule('active_inactive'),
            'inactive_reason' => 'nullable|string|max:2000',
            'yarn_order_id' => 'nullable|exists:yarn_orders,id',
            'fabric_id' => 'nullable|exists:fabrics,id',
        ]);

        $statusAfter = array_key_exists('status', $validated) ? $validated['status'] : $loom->status;
        if ($statusAfter === 'Inactive') {
            $reason = array_key_exists('inactive_reason', $validated)
                ? $validated['inactive_reason']
                : $loom->inactive_reason;
            $reason = is_string($reason) ? trim($reason) : '';
            if ($reason === '') {
                return response()->json([
                    'message' => 'A reason is required when status is Inactive.',
                    'errors' => ['inactive_reason' => ['Please provide a reason for marking this loom inactive.']],
                ], 422);
            }
            $validated['inactive_reason'] = $reason;
        } elseif (array_key_exists('status', $validated) && $validated['status'] === 'Active') {
            $validated['inactive_reason'] = null;
        }

        if (array_key_exists('yarn_order_id', $validated) && ($validated['yarn_order_id'] ?? null) === null) {
            $validated['fabric_id'] = null;
        }

        $yarnOrderAfter = array_key_exists('yarn_order_id', $validated)
            ? $validated['yarn_order_id']
            : $loom->yarn_order_id;

        if (array_key_exists('yarn_order_id', $validated) && ! array_key_exists('fabric_id', $validated) && $loom->fabric_id) {
            if (! $this->fabricFitsYarnOrder((int) $loom->fabric_id, $yarnOrderAfter)) {
                $validated['fabric_id'] = null;
            }
        }

        if (array_key_exists('fabric_id', $validated)) {
            $nextFabric = $validated['fabric_id'] !== null && $validated['fabric_id'] !== ''
                ? (int) $validated['fabric_id']
                : null;
            if (! $this->fabricFitsYarnOrder($nextFabric, $yarnOrderAfter)) {
                return response()->json(['message' => 'Fabric (SL) must belong to the selected yarn order.'], 422);
            }
            $validated['fabric_id'] = $nextFabric;
        }

        $loom->update($validated);
        $fresh = $loom->fresh(['fabric:id,sl_number,yarn_order_id']);

        return response()->json(['data' => new LoomResource($fresh)]);
    }

    private function fabricFitsYarnOrder(?int $fabricId, mixed $yarnOrderId): bool
    {
        if ($fabricId === null) {
            return true;
        }
        $oid = $yarnOrderId !== null && $yarnOrderId !== '' ? (int) $yarnOrderId : null;
        if ($oid === null) {
            return false;
        }

        return Fabric::query()
            ->whereKey($fabricId)
            ->where('yarn_order_id', $oid)
            ->exists();
    }

    public function destroy(Loom $loom): JsonResponse
    {
        $loom->delete();

        return response()->json(['message' => 'Loom deleted successfully']);
    }

    /**
     * List for Daily Entry and similar screens: all looms with current status from DB
     * (not only Active), so badges and rules match the `looms.status` column.
     */
    public function list(): JsonResponse
    {
        $looms = Loom::query()
            ->with([
                'fabric:id,sl_number,yarn_order_id',
                'assignedFabrics:id,loom_id,yarn_order_id,sl_number,design,weave_technique,colour',
            ])
            ->orderBy('loom_number')
            ->get();

        return response()->json(['data' => LoomResource::collection($looms)->resolve()]);
    }

    /**
     * Current production attributes from the fabric row assigned to this loom (latest by id).
     */
    public function configuration(Loom $loom): JsonResponse
    {
        return response()->json($this->configurationPayload($loom));
    }

    /**
     * Batch configuration for Daily Entry: GET /looms/configurations?ids=1,2,3
     */
    public function configurations(Request $request): JsonResponse
    {
        $raw = (string) $request->query('ids', '');
        $ids = array_values(array_filter(array_map(
            fn ($x) => (int) trim($x),
            explode(',', $raw),
        )));
        if ($ids === []) {
            return response()->json(['data' => (object) []]);
        }
        $looms = Loom::query()->whereIn('id', $ids)->get()->keyBy(fn ($l) => (int) $l->id);
        $out = [];
        foreach ($ids as $id) {
            $loom = $looms->get($id);
            $out[(string) $id] = $this->configurationPayload($loom);
        }

        return response()->json(['data' => $out]);
    }

    /**
     * @return array{design: ?string, weave_tech: ?string, colour: ?string}
     */
    private function configurationPayload(?Loom $loom): array
    {
        if (! $loom) {
            return ['design' => null, 'weave_tech' => null, 'colour' => null];
        }
        $fabric = Fabric::query()
            ->where('loom_id', $loom->id)
            ->orderByDesc('id')
            ->first(['design', 'weave_technique', 'colour']);
        if (! $fabric) {
            return ['design' => null, 'weave_tech' => null, 'colour' => null];
        }

        return [
            'design' => $fabric->design,
            'weave_tech' => $fabric->weave_technique,
            'colour' => $fabric->colour,
        ];
    }
}
