<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\LoomEntryResource;
use App\Models\GenericCode;
use App\Models\LoomEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LoomEntryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $this->clampPerPage($request, 10, 100);
        $entries = LoomEntry::with(['loom', 'weaver1', 'weaver2'])
            ->when($request->loom_id, fn ($q) => $q->where('loom_id', $request->loom_id))
            ->when($request->date_from, fn ($q) => $q->whereDate('date', '>=', $request->date_from))
            ->when($request->date_to, fn ($q) => $q->whereDate('date', '<=', $request->date_to))
            ->orderBy('date', 'desc')
            ->orderBy('loom_id')
            ->paginate($perPage);

        return $this->paginatedResponse(
            $entries,
            LoomEntryResource::collection($entries->items())->resolve()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'loom_id' => 'required|exists:looms,id',
            'yarn_order_id' => 'nullable|exists:yarn_orders,id',
            'fabric_id' => 'nullable|exists:fabrics,id',
            'date' => 'required|date',
            'shift' => GenericCode::validationRule('shift', true),
            'meters_produced' => 'required|numeric|min:0',
            'production' => 'nullable|numeric|min:0',
            'rejected_meters' => 'nullable|numeric|min:0',
            'operator_name' => 'nullable|string|max:255',
            'weaver1_id' => 'nullable|exists:weavers,id',
            'weaver2_id' => 'nullable|exists:weavers,id',
            'remarks' => 'nullable|string',
        ]);

        if (array_key_exists('production', $validated) && ! array_key_exists('meters_produced', $validated)) {
            $validated['meters_produced'] = $validated['production'];
        }
        $validated['rejected_meters'] = $validated['rejected_meters'] ?? 0;
        unset($validated['production']);

        $entry = LoomEntry::create($validated);

        return response()->json(['data' => new LoomEntryResource($entry->load(['loom', 'weaver1', 'weaver2']))], 201);
    }

    public function show(LoomEntry $loomEntry): JsonResponse
    {
        $loomEntry->load(['loom', 'yarnOrder', 'weaver1', 'weaver2']);

        return response()->json(['data' => new LoomEntryResource($loomEntry)]);
    }

    public function update(Request $request, LoomEntry $loomEntry): JsonResponse
    {
        $validated = $request->validate([
            'loom_id' => 'sometimes|required|exists:looms,id',
            'yarn_order_id' => 'nullable|exists:yarn_orders,id',
            'fabric_id' => 'nullable|exists:fabrics,id',
            'date' => 'sometimes|required|date',
            'shift' => array_merge(['sometimes', 'required'], array_slice(GenericCode::validationRule('shift', true), 1)),
            'meters_produced' => 'sometimes|required|numeric|min:0',
            'production' => 'nullable|numeric|min:0',
            'rejected_meters' => 'nullable|numeric|min:0',
            'operator_name' => 'nullable|string|max:255',
            'weaver1_id' => 'nullable|exists:weavers,id',
            'weaver2_id' => 'nullable|exists:weavers,id',
            'remarks' => 'nullable|string',
        ]);

        if (array_key_exists('production', $validated) && ! array_key_exists('meters_produced', $validated)) {
            $validated['meters_produced'] = $validated['production'];
        }
        unset($validated['production']);

        $loomEntry->update($validated);

        return response()->json(['data' => new LoomEntryResource($loomEntry->fresh(['loom', 'weaver1', 'weaver2']))]);
    }

    public function destroy(LoomEntry $loomEntry): JsonResponse
    {
        $loomEntry->delete();

        return response()->json(['message' => 'Loom entry deleted successfully']);
    }
}
