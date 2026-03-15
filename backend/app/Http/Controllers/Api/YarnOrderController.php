<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\YarnOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class YarnOrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->input('per_page', 50);
        $perPage = $perPage >= 1 && $perPage <= 100 ? $perPage : 50;
        $orders = YarnOrder::query()->orderBy('created_at', 'desc')->orderBy('id', 'desc')->paginate($perPage);
        return response()->json([
            'data' => $orders->items(),
            'meta' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_from' => 'nullable|string|max:255',
            'weaving_unit' => 'nullable|string|max:255',
            'po_number' => 'nullable|string|max:64',
            'customer' => 'nullable|string|max:255',
            'po_date' => 'nullable|date',
            'delivery_date' => 'nullable|date',
        ]);
        $order = YarnOrder::create($validated);
        return response()->json(['data' => $order], 201);
    }

    public function show(YarnOrder $yarnOrder): JsonResponse
    {
        return response()->json(['data' => $yarnOrder]);
    }

    /**
     * Single-call entry data: order + receipts + fabrics + yarn_requirements (one round trip).
     */
    public function entry(YarnOrder $yarnOrder): JsonResponse
    {
        $id = $yarnOrder->id;
        [$receipts, $fabrics, $requirements] = [
            \App\Models\YarnReceipt::where('yarn_order_id', $id)->orderBy('date', 'desc')->orderBy('id', 'desc')->get(),
            \App\Models\Fabric::where('yarn_order_id', $id)->orderBy('id')->get(),
            \App\Models\YarnRequirement::where('yarn_order_id', $id)->orderBy('id')->get(),
        ];
        return response()->json([
            'data' => [
                'order' => $yarnOrder,
                'receipts' => $receipts,
                'fabrics' => $fabrics,
                'yarn_requirements' => $requirements,
            ],
        ]);
    }

    public function update(Request $request, YarnOrder $yarnOrder): JsonResponse
    {
        $validated = $request->validate([
            'order_from' => 'nullable|string|max:255',
            'weaving_unit' => 'nullable|string|max:255',
            'po_number' => 'nullable|string|max:64',
            'customer' => 'nullable|string|max:255',
            'po_date' => 'nullable|date',
            'delivery_date' => 'nullable|date',
        ]);
        $yarnOrder->update($validated);
        return response()->json(['data' => $yarnOrder->fresh()]);
    }

    public function destroy(YarnOrder $yarnOrder): JsonResponse
    {
        $yarnOrder->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
