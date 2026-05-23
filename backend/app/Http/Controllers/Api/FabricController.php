<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Fabric;
use App\Models\GenericCode;
use App\Models\Loom;
use App\Models\LoomAssignmentHistory;
use App\Services\LoomOrderAssignmentService;
use App\Support\SlNumberFormatter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FabricController extends Controller
{
    public function __construct(
        private readonly LoomOrderAssignmentService $loomOrderAssignmentService,
    ) {}
    /**
     * Get fabrics for a yarn order (paginated).
     * GET /fabrics/yarn-order/:yarnOrderId?page=&per_page=
     */
    public function indexByYarnOrder(Request $request, string $yarnOrderId): JsonResponse
    {
        // Do not 404 when the yarn order row is missing (stale loom/assignment refs).
        // Return an empty page so list UIs and prefetch helpers stay stable.
        $perPage = $this->clampPerPageLarge($request, 25, 200);
        $fabrics = Fabric::where('yarn_order_id', $yarnOrderId)
            ->orderBy('id')
            ->paginate($perPage);

        $seqMap = SlNumberFormatter::sequenceByFabricIdForYarnOrder((int) $yarnOrderId);
        $data = array_map(
            fn (Fabric $f) => SlNumberFormatter::fabricToArrayWithSlNumber($f, $seqMap),
            $fabrics->items()
        );

        return $this->paginatedResponse($fabrics, $data);
    }

    /**
     * Create a new fabric entry.
     * POST /fabrics
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'yarn_order_id' => 'required|exists:yarn_orders,id',
            'loom_id' => 'nullable|exists:looms,id',
            'description' => 'nullable|string|max:255',
            'colour' => GenericCode::validationRulePlusSeparatedMaster('colour', false, 512),
            'design' => 'nullable|string|max:255',
            'weave_technique' => GenericCode::validationRule('weave_technique', false, GenericCode::DROPDOWN_TYPE_MASTER, 255),
            'warp_count' => 'nullable|string|max:64',
            'warp_content' => 'nullable|string|max:255',
            'weft_count' => 'nullable|string|max:64',
            'weft_content' => 'nullable|string|max:255',
            'con_final_reed' => 'nullable|numeric',
            'con_final_pick' => 'nullable|numeric',
            'con_on_loom_reed' => 'nullable|numeric',
            'con_on_loom_pick' => 'nullable|numeric',
            'gsm_required' => 'nullable|numeric',
            'actual_gsm' => 'nullable|numeric',
            'required_width' => 'nullable|numeric',
            'po_quantity' => 'nullable|numeric',
            'price_per_metre' => 'nullable|numeric',
            'total_meters_produced' => 'nullable|numeric|min:0',
        ]);
        if (! $this->loomIsAssignable($validated['loom_id'] ?? null)) {
            return response()->json(['message' => 'Cannot assign an inactive loom.'], 422);
        }
        $fabric = Fabric::create($validated);
        SlNumberFormatter::refreshSlNumbersForYarnOrder((int) $fabric->yarn_order_id);
        $fabric->refresh();
        $fabric->load('yarnOrder');

        if (! empty($fabric->loom_id)) {
            $this->recordAssignmentSnapshot((int) $fabric->loom_id, $fabric);
        }

        return response()->json(['data' => SlNumberFormatter::fabricToArrayWithSlNumber($fabric)], 201);
    }

    /**
     * Update a fabric.
     * PUT /fabrics/:id
     */
    public function update(Request $request, Fabric $fabric): JsonResponse
    {
        $validated = $request->validate([
            'loom_id' => 'nullable|exists:looms,id',
            'description' => 'nullable|string|max:255',
            'colour' => GenericCode::validationRulePlusSeparatedMaster('colour', false, 512),
            'design' => 'nullable|string|max:255',
            'weave_technique' => GenericCode::validationRule('weave_technique', false, GenericCode::DROPDOWN_TYPE_MASTER, 255),
            'warp_count' => 'nullable|string|max:64',
            'warp_content' => 'nullable|string|max:255',
            'weft_count' => 'nullable|string|max:64',
            'weft_content' => 'nullable|string|max:255',
            'con_final_reed' => 'nullable|numeric',
            'con_final_pick' => 'nullable|numeric',
            'con_on_loom_reed' => 'nullable|numeric',
            'con_on_loom_pick' => 'nullable|numeric',
            'gsm_required' => 'nullable|numeric',
            'actual_gsm' => 'nullable|numeric',
            'required_width' => 'nullable|numeric',
            'po_quantity' => 'nullable|numeric',
            'price_per_metre' => 'nullable|numeric',
            'total_meters_produced' => 'nullable|numeric|min:0',
        ]);
        if (array_key_exists('loom_id', $validated) && ! $this->loomIsAssignable($validated['loom_id'])) {
            return response()->json(['message' => 'Cannot assign an inactive loom.'], 422);
        }

        $previousLoomId = $fabric->loom_id !== null ? (int) $fabric->loom_id : null;
        $fabric->update($validated);
        $fresh = $fabric->fresh();
        $fresh->load('yarnOrder');

        if (array_key_exists('loom_id', $validated)) {
            $nextLoomId = $validated['loom_id'] !== null && $validated['loom_id'] !== ''
                ? (int) $validated['loom_id']
                : null;
            if ($nextLoomId !== $previousLoomId) {
                // Old loom is no longer running this fabric → mark it unassigned.
                if ($previousLoomId !== null) {
                    $this->recordUnassignmentSnapshot($previousLoomId);
                }
                // New loom is now running this fabric → snapshot the new assignment.
                if ($nextLoomId !== null) {
                    $this->recordAssignmentSnapshot($nextLoomId, $fresh);
                }
            }
        }

        return response()->json(['data' => SlNumberFormatter::fabricToArrayWithSlNumber($fresh)]);
    }

    private function loomIsAssignable(mixed $loomId): bool
    {
        if ($loomId === null || $loomId === '') {
            return true;
        }
        $status = Loom::query()->whereKey((int) $loomId)->value('status');
        if (! is_string($status)) {
            return false;
        }

        return strtolower(trim($status)) !== 'inactive';
    }

    /**
     * Snapshot a loom assignment: records what fabric/design/weave/colour the
     * loom started running at `now()`. Past dates will keep resolving to the
     * row effective before this timestamp (preserving history).
     */
    private function recordAssignmentSnapshot(int $loomId, Fabric $fabric): void
    {
        $this->loomOrderAssignmentService->assignFabricToLoom($loomId, $fabric);

        LoomAssignmentHistory::create([
            'loom_id' => $loomId,
            'fabric_id' => (int) $fabric->id,
            'yarn_order_id' => $fabric->yarn_order_id !== null ? (int) $fabric->yarn_order_id : null,
            'sl_number' => $fabric->sl_number,
            'design' => $fabric->design,
            'weave_technique' => $fabric->weave_technique,
            'colour' => $fabric->colour,
            'assigned_at' => now(),
        ]);
    }

    /**
     * Snapshot a loom becoming unassigned (no fabric running on it from now on).
     */
    private function recordUnassignmentSnapshot(int $loomId): void
    {
        $this->loomOrderAssignmentService->unassignLoom($loomId);

        LoomAssignmentHistory::create([
            'loom_id' => $loomId,
            'fabric_id' => null,
            'yarn_order_id' => null,
            'sl_number' => null,
            'design' => null,
            'weave_technique' => null,
            'colour' => null,
            'assigned_at' => now(),
        ]);
    }

    /**
     * Delete a fabric.
     * DELETE /fabrics/:id
     */
    public function destroy(Fabric $fabric): JsonResponse
    {
        $yarnOrderId = (int) $fabric->yarn_order_id;
        $fabric->delete();
        // Keep per-order SL serial contiguous (1, 2, 3, …) after a deletion.
        if ($yarnOrderId > 0) {
            SlNumberFormatter::refreshSlNumbersForYarnOrder($yarnOrderId);
        }

        return response()->json(['message' => 'Deleted']);
    }

    /**
     * Replace all fabrics for a yarn order (bulk sync).
     * POST /fabrics/bulk
     * Body: { yarn_order_id: int, fabrics: [{ description, design, ... }, ...] }
     */
    public function bulkStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'yarn_order_id' => 'required|exists:yarn_orders,id',
            'fabrics' => 'required|array',
            'fabrics.*.description' => 'nullable|string|max:255',
            'fabrics.*.colour' => GenericCode::validationRulePlusSeparatedMaster('colour', false, 512),
            'fabrics.*.design' => 'nullable|string|max:255',
            'fabrics.*.weave_technique' => GenericCode::validationRule('weave_technique', false, GenericCode::DROPDOWN_TYPE_MASTER, 255),
            'fabrics.*.warp_count' => 'nullable|string|max:64',
            'fabrics.*.warp_content' => 'nullable|string|max:255',
            'fabrics.*.weft_count' => 'nullable|string|max:64',
            'fabrics.*.weft_content' => 'nullable|string|max:255',
            'fabrics.*.con_final_reed' => 'nullable|numeric',
            'fabrics.*.con_final_pick' => 'nullable|numeric',
            'fabrics.*.con_on_loom_reed' => 'nullable|numeric',
            'fabrics.*.con_on_loom_pick' => 'nullable|numeric',
            'fabrics.*.gsm_required' => 'nullable|numeric',
            'fabrics.*.actual_gsm' => 'nullable|numeric',
            'fabrics.*.required_width' => 'nullable|numeric',
            'fabrics.*.po_quantity' => 'nullable|numeric',
            'fabrics.*.price_per_metre' => 'nullable|numeric',
            'fabrics.*.total_meters_produced' => 'nullable|numeric|min:0',
        ]);

        $yarnOrderId = (int) $validated['yarn_order_id'];
        Fabric::where('yarn_order_id', $yarnOrderId)->delete();

        $created = [];
        Fabric::withoutEvents(function () use ($validated, $yarnOrderId, &$created) {
            foreach ($validated['fabrics'] as $row) {
                $fabric = Fabric::create([
                    'yarn_order_id' => $yarnOrderId,
                    'description' => $row['description'] ?? null,
                    'colour' => isset($row['colour']) && $row['colour'] !== '' ? $row['colour'] : null,
                    'design' => $row['design'] ?? null,
                    'weave_technique' => $row['weave_technique'] ?? null,
                    'warp_count' => $row['warp_count'] ?? null,
                    'warp_content' => $row['warp_content'] ?? null,
                    'weft_count' => $row['weft_count'] ?? null,
                    'weft_content' => $row['weft_content'] ?? null,
                    'con_final_reed' => isset($row['con_final_reed']) ? (float) $row['con_final_reed'] : null,
                    'con_final_pick' => isset($row['con_final_pick']) ? (float) $row['con_final_pick'] : null,
                    'con_on_loom_reed' => isset($row['con_on_loom_reed']) ? (float) $row['con_on_loom_reed'] : null,
                    'con_on_loom_pick' => isset($row['con_on_loom_pick']) ? (float) $row['con_on_loom_pick'] : null,
                    'gsm_required' => isset($row['gsm_required']) ? (float) $row['gsm_required'] : null,
                    'actual_gsm' => isset($row['actual_gsm']) ? (float) $row['actual_gsm'] : null,
                    'required_width' => isset($row['required_width']) ? (float) $row['required_width'] : null,
                    'po_quantity' => isset($row['po_quantity']) ? (float) $row['po_quantity'] : null,
                    'price_per_metre' => isset($row['price_per_metre']) ? (float) $row['price_per_metre'] : null,
                    'total_meters_produced' => isset($row['total_meters_produced']) ? (float) $row['total_meters_produced'] : 0,
                ]);
                $created[] = $fabric;
            }
        });

        log_audit('fabrics', 'update', $yarnOrderId, 'Bulk replaced '.count($created).' fabric row(s) for order #'.$yarnOrderId);

        SlNumberFormatter::refreshSlNumbersForYarnOrder($yarnOrderId);

        $seqMap = SlNumberFormatter::sequenceByFabricIdForYarnOrder($yarnOrderId);
        $data = Fabric::where('yarn_order_id', $yarnOrderId)
            ->orderBy('id')
            ->get()
            ->map(fn (Fabric $f) => SlNumberFormatter::fabricToArrayWithSlNumber($f, $seqMap))
            ->all();

        return response()->json(['data' => $data, 'message' => count($data).' fabric(s) saved'], 201);
    }
}
