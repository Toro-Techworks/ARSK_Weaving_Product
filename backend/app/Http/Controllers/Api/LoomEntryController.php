<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\LoomEntryResource;
use App\Models\LoomEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LoomEntryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->input('per_page', 15);
        $entries = LoomEntry::with(['loom'])
            ->when($request->loom_id, fn ($q) => $q->where('loom_id', $request->loom_id))
            ->when($request->date_from, fn ($q) => $q->whereDate('date', '>=', $request->date_from))
            ->when($request->date_to, fn ($q) => $q->whereDate('date', '<=', $request->date_to))
            ->orderBy('date', 'desc')
            ->orderBy('loom_id')
            ->paginate($perPage);

        return response()->json([
            'data' => LoomEntryResource::collection($entries),
            'meta' => [
                'current_page' => $entries->currentPage(),
                'last_page' => $entries->lastPage(),
                'per_page' => $entries->perPage(),
                'total' => $entries->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'loom_id' => 'required|exists:looms,id',
            'order_id' => 'nullable|exists:orders,id',
            'date' => 'required|date',
            'shift' => 'required|string|max:50',
            'meters_produced' => 'required|numeric|min:0',
            'rejected_meters' => 'nullable|numeric|min:0',
            'operator_name' => 'nullable|string|max:255',
        ]);

        $validated['rejected_meters'] = $validated['rejected_meters'] ?? 0;

        $entry = LoomEntry::create($validated);
        return response()->json(['data' => new LoomEntryResource($entry->load(['loom']))], 201);
    }

    public function show(LoomEntry $loomEntry): JsonResponse
    {
        $loomEntry->load(['loom', 'order']);
        return response()->json(['data' => new LoomEntryResource($loomEntry)]);
    }

    public function update(Request $request, LoomEntry $loomEntry): JsonResponse
    {
        $validated = $request->validate([
            'loom_id' => 'sometimes|required|exists:looms,id',
            'date' => 'sometimes|required|date',
            'shift' => 'sometimes|required|string|max:50',
            'meters_produced' => 'sometimes|required|numeric|min:0',
            'rejected_meters' => 'nullable|numeric|min:0',
            'operator_name' => 'nullable|string|max:255',
        ]);

        $loomEntry->update($validated);
        return response()->json(['data' => new LoomEntryResource($loomEntry->fresh(['loom']))]);
    }

    public function destroy(LoomEntry $loomEntry): JsonResponse
    {
        $loomEntry->delete();
        return response()->json(['message' => 'Loom entry deleted successfully']);
    }
}
