<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Fabric;
use App\Models\YarnOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FabricController extends Controller
{
    /**
     * Get all fabrics for a yarn order.
     * GET /fabrics/yarn-order/:yarnOrderId
     */
    public function indexByYarnOrder(string $yarnOrderId): JsonResponse
    {
        if (! YarnOrder::where('id', $yarnOrderId)->exists()) {
            return response()->json(['message' => 'Yarn order not found.'], 404);
        }
        $fabrics = Fabric::where('yarn_order_id', $yarnOrderId)->orderBy('id')->get();
        return response()->json(['data' => $fabrics]);
    }

    /**
     * Create a new fabric entry.
     * POST /fabrics
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'yarn_order_id' => 'required|exists:yarn_orders,id',
            'description' => 'nullable|string|max:255',
            'design' => 'nullable|string|max:255',
            'weave_technique' => 'nullable|string|max:255',
            'warp_count' => 'nullable|string|max:64',
            'warp_content' => 'nullable|string|max:255',
            'weft_count' => 'nullable|string|max:64',
            'weft_content' => 'nullable|string|max:255',
            'con_final_reed' => 'nullable|numeric',
            'con_final_pick' => 'nullable|numeric',
            'con_on_loom_reed' => 'nullable|numeric',
            'con_on_loom_pick' => 'nullable|numeric',
            'gsm_required' => 'nullable|numeric',
            'required_width' => 'nullable|numeric',
            'po_quantity' => 'nullable|numeric',
            'price_per_metre' => 'nullable|numeric',
        ]);
        $fabric = Fabric::create($validated);
        return response()->json(['data' => $fabric], 201);
    }

    /**
     * Update a fabric.
     * PUT /fabrics/:id
     */
    public function update(Request $request, Fabric $fabric): JsonResponse
    {
        $validated = $request->validate([
            'description' => 'nullable|string|max:255',
            'design' => 'nullable|string|max:255',
            'weave_technique' => 'nullable|string|max:255',
            'warp_count' => 'nullable|string|max:64',
            'warp_content' => 'nullable|string|max:255',
            'weft_count' => 'nullable|string|max:64',
            'weft_content' => 'nullable|string|max:255',
            'con_final_reed' => 'nullable|numeric',
            'con_final_pick' => 'nullable|numeric',
            'con_on_loom_reed' => 'nullable|numeric',
            'con_on_loom_pick' => 'nullable|numeric',
            'gsm_required' => 'nullable|numeric',
            'required_width' => 'nullable|numeric',
            'po_quantity' => 'nullable|numeric',
            'price_per_metre' => 'nullable|numeric',
        ]);
        $fabric->update($validated);
        return response()->json(['data' => $fabric->fresh()]);
    }

    /**
     * Delete a fabric.
     * DELETE /fabrics/:id
     */
    public function destroy(Fabric $fabric): JsonResponse
    {
        $fabric->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
