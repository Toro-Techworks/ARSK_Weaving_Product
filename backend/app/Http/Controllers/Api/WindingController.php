<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\WindingResource;
use App\Models\Winding;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WindingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $this->clampPerPage($request, 10, 100);

        $q = Winding::query()
            ->with(['windingUnit:id,company_name', 'yarnOrder:id,order_from,customer,po_number,created_at'])
            ->orderByDesc('outward_date')
            ->orderByDesc('id');

        if ($request->filled('winding_unit_id')) {
            $q->where('winding_unit_id', (int) $request->input('winding_unit_id'));
        }
        if ($request->filled('yarn_order_id')) {
            $q->where('yarn_order_id', (int) $request->input('yarn_order_id'));
        }
        if ($request->filled('order_from')) {
            $q->where('order_from', $request->input('order_from'));
        }
        if ($request->filled('search')) {
            $term = '%'.str_replace(['%', '_'], ['\%', '\_'], trim((string) $request->input('search'))).'%';
            $q->where(function ($inner) use ($term) {
                $inner->where('order_from', 'like', $term)
                    ->orWhereRaw('CAST(id AS CHAR) LIKE ?', [$term])
                    ->orWhereHas('windingUnit', function ($wu) use ($term) {
                        $wu->where('company_name', 'like', $term);
                    })
                    ->orWhereHas('yarnOrder', function ($yo) use ($term) {
                        $yo->where('customer', 'like', $term)
                            ->orWhere('po_number', 'like', $term)
                            ->orWhereRaw('CAST(id AS CHAR) LIKE ?', [$term]);
                    });
            });
        }

        $windings = $q->paginate($perPage);

        return $this->paginatedResponse(
            $windings,
            WindingResource::collection($windings->items())->resolve()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'winding_unit_id' => 'required|integer|exists:winding_units,id',
            'outward_date' => 'nullable|date',
            'inward_date' => 'nullable|date|after_or_equal:outward_date',
            'price_per_kg' => 'nullable|numeric|min:0',
            'amount' => 'nullable|numeric|min:0',
            'order_from' => 'nullable|string|max:255',
            'yarn_order_id' => 'nullable|integer|exists:yarn_orders,id',
            'hank_kgs' => 'nullable|numeric|min:0',
            'cone_kgs' => 'nullable|numeric|min:0',
        ]);

        $winding = Winding::create($validated);
        $winding->load(['windingUnit:id,company_name', 'yarnOrder:id,order_from,customer,po_number,created_at']);

        return response()->json(['data' => new WindingResource($winding)], 201);
    }

    public function show(Winding $winding): JsonResponse
    {
        $winding->load(['windingUnit:id,company_name', 'yarnOrder:id,order_from,customer,po_number,created_at']);

        return response()->json(['data' => new WindingResource($winding)]);
    }

    public function update(Request $request, Winding $winding): JsonResponse
    {
        $validated = $request->validate([
            'winding_unit_id' => 'sometimes|required|integer|exists:winding_units,id',
            'outward_date' => 'nullable|date',
            'inward_date' => 'nullable|date|after_or_equal:outward_date',
            'price_per_kg' => 'nullable|numeric|min:0',
            'amount' => 'nullable|numeric|min:0',
            'order_from' => 'nullable|string|max:255',
            'yarn_order_id' => 'nullable|integer|exists:yarn_orders,id',
            'hank_kgs' => 'nullable|numeric|min:0',
            'cone_kgs' => 'nullable|numeric|min:0',
        ]);

        $winding->update($validated);
        $winding->load(['windingUnit:id,company_name', 'yarnOrder:id,order_from,customer,po_number,created_at']);

        return response()->json(['data' => new WindingResource($winding->fresh(['windingUnit', 'yarnOrder']))]);
    }

    public function destroy(Winding $winding): JsonResponse
    {
        $winding->delete();

        return response()->json(['message' => 'Winding entry deleted successfully']);
    }
}
