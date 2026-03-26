<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\WeavingUnitResource;
use App\Models\WeavingUnit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WeavingUnitController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $this->clampPerPage($request, 10, 100);
        $units = WeavingUnit::query()
            ->when($request->search, fn ($q) => $q->where('company_name', 'like', "%{$request->search}%")
                ->orWhere('gst_number', 'like', "%{$request->search}%"))
            ->orderBy('company_name')
            ->paginate($perPage);

        return $this->paginatedResponse(
            $units,
            WeavingUnitResource::collection($units->items())->resolve()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'company_name' => 'required|string|max:255',
            'gst_number' => 'nullable|string|max:50',
            'address' => 'nullable|string',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'payment_terms' => 'nullable|string|max:255',
        ]);

        $unit = WeavingUnit::create($validated);
        return response()->json(['data' => new WeavingUnitResource($unit)], 201);
    }

    public function show(WeavingUnit $weavingUnit): JsonResponse
    {
        return response()->json(['data' => new WeavingUnitResource($weavingUnit)]);
    }

    public function update(Request $request, WeavingUnit $weavingUnit): JsonResponse
    {
        $validated = $request->validate([
            'company_name' => 'sometimes|required|string|max:255',
            'gst_number' => 'nullable|string|max:50',
            'address' => 'nullable|string',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'payment_terms' => 'nullable|string|max:255',
        ]);

        $weavingUnit->update($validated);
        return response()->json(['data' => new WeavingUnitResource($weavingUnit->fresh())]);
    }

    public function destroy(WeavingUnit $weavingUnit): JsonResponse
    {
        $weavingUnit->delete();
        return response()->json(['message' => 'Weaving unit deleted successfully']);
    }
}
