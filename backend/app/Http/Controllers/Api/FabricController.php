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
            'fabrics.*.design' => 'nullable|string|max:255',
            'fabrics.*.weave_technique' => 'nullable|string|max:255',
            'fabrics.*.warp_count' => 'nullable|string|max:64',
            'fabrics.*.warp_content' => 'nullable|string|max:255',
            'fabrics.*.weft_count' => 'nullable|string|max:64',
            'fabrics.*.weft_content' => 'nullable|string|max:255',
            'fabrics.*.con_final_reed' => 'nullable|numeric',
            'fabrics.*.con_final_pick' => 'nullable|numeric',
            'fabrics.*.con_on_loom_reed' => 'nullable|numeric',
            'fabrics.*.con_on_loom_pick' => 'nullable|numeric',
            'fabrics.*.gsm_required' => 'nullable|numeric',
            'fabrics.*.required_width' => 'nullable|numeric',
            'fabrics.*.po_quantity' => 'nullable|numeric',
            'fabrics.*.price_per_metre' => 'nullable|numeric',
        ]);

        $yarnOrderId = (int) $validated['yarn_order_id'];
        Fabric::where('yarn_order_id', $yarnOrderId)->delete();

        $created = [];
        foreach ($validated['fabrics'] as $row) {
            $fabric = Fabric::create([
                'yarn_order_id' => $yarnOrderId,
                'description' => $row['description'] ?? null,
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
                'required_width' => isset($row['required_width']) ? (float) $row['required_width'] : null,
                'po_quantity' => isset($row['po_quantity']) ? (float) $row['po_quantity'] : null,
                'price_per_metre' => isset($row['price_per_metre']) ? (float) $row['price_per_metre'] : null,
            ]);
            $created[] = $fabric;
        }

        return response()->json(['data' => $created, 'message' => count($created) . ' fabric(s) saved'], 201);
    }
}
