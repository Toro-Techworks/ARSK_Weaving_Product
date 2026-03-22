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
        $perPage = $this->clampPerPage($request, 10, 100);
        $q = YarnOrder::query()->orderBy('created_at', 'desc')->orderBy('id', 'desc');
        $search = $request->input('search');
        if ($search && is_string($search) && strlen(trim($search)) > 0) {
            $term = '%' . trim($search) . '%';
            $q->where(function ($query) use ($term) {
                $query->where('po_number', 'like', $term)
                    ->orWhere('customer', 'like', $term)
                    ->orWhere('order_from', 'like', $term)
                    ->orWhereRaw('CAST(id AS CHAR) LIKE ?', [$term]);
            });
        }
        $orders = $q->paginate($perPage);

        return $this->paginatedResponse($orders, $orders->items());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'loom_id' => 'nullable|exists:looms,id',
            'order_from' => 'nullable|string|max:255',
            'weaving_unit' => 'nullable|string|max:255',
            'design' => 'nullable|string',
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
     * Single-call entry data: order + receipts + fabrics + yarn_requirements (one round trip, eager loaded).
     */
    public function entry(YarnOrder $yarnOrder): JsonResponse
    {
        $yarnOrder->load([
            'yarnReceipts' => fn ($q) => $q->orderBy('date', 'desc')->orderBy('id', 'desc'),
            'fabrics' => fn ($q) => $q->orderBy('id'),
            'yarnRequirements' => fn ($q) => $q->orderBy('id'),
        ]);
        return response()->json([
            'data' => [
                'order' => $yarnOrder,
                'receipts' => $yarnOrder->yarnReceipts,
                'fabrics' => $yarnOrder->fabrics,
                'yarn_requirements' => $yarnOrder->yarnRequirements,
            ],
        ]);
    }

    public function update(Request $request, YarnOrder $yarnOrder): JsonResponse
    {
        $validated = $request->validate([
            'loom_id' => 'nullable|exists:looms,id',
            'order_from' => 'nullable|string|max:255',
            'weaving_unit' => 'nullable|string|max:255',
            'design' => 'nullable|string',
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
