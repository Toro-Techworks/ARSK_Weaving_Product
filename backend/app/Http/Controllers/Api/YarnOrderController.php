<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\YarnOrder;
use App\Support\SlNumberFormatter;
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
            $term = '%'.$this->escapeLike(trim($search)).'%';
            $q->where(function ($query) use ($term) {
                $query->where('po_number', 'like', $term)
                    ->orWhere('customer', 'like', $term)
                    ->orWhere('order_from', 'like', $term)
                    ->orWhereRaw('CAST(id AS CHAR) LIKE ?', [$term]);
            });
        }

        $this->applyColumnFilters($q, $request);

        $orders = $q->paginate($perPage);

        return $this->paginatedResponse($orders, $orders->items());
    }

    /** Escape % and _ for LIKE patterns. */
    private function escapeLike(string $value): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
    }

    /**
     * Optional filters (AND): filter_order_id, filter_order_from,
     * filter_customer, filter_po_number.
     */
    private function applyColumnFilters($query, Request $request): void
    {
        $oid = $request->input('filter_order_id');
        if ($oid !== null && $oid !== '' && is_string($oid) && strlen(trim($oid)) > 0) {
            $v = trim($oid);
            $like = '%'.$this->escapeLike($v).'%';
            $query->whereRaw('CAST(id AS CHAR) LIKE ?', [$like]);
        }

        $map = [
            'filter_order_from' => 'order_from',
            'filter_customer' => 'customer',
            'filter_po_number' => 'po_number',
        ];
        foreach ($map as $param => $column) {
            $val = $request->input($param);
            if ($val !== null && $val !== '' && is_string($val) && strlen(trim($val)) > 0) {
                $like = '%'.$this->escapeLike(trim($val)).'%';
                $query->where($column, 'like', $like);
            }
        }
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
     * Single-call entry data: order + receipts + fabrics + yarn_requirements (one round trip, eager loaded).
     */
    public function entry(YarnOrder $yarnOrder): JsonResponse
    {
        $yarnOrder->load([
            'yarnReceipts' => fn ($q) => $q->orderBy('date', 'desc')->orderBy('id', 'desc'),
            'fabrics' => fn ($q) => $q->orderBy('id'),
            'yarnRequirements' => fn ($q) => $q->orderBy('id'),
        ]);
        $oid = (int) $yarnOrder->id;
        $seqMap = SlNumberFormatter::sequenceByFabricIdForYarnOrder($oid);
        $fabrics = $yarnOrder->fabrics
            ->map(fn ($f) => SlNumberFormatter::fabricToArrayWithSlNumber($f, $seqMap))
            ->values()
            ->all();

        return response()->json([
            'data' => [
                'order' => $yarnOrder,
                'receipts' => $yarnOrder->yarnReceipts,
                'fabrics' => $fabrics,
                'yarn_requirements' => $yarnOrder->yarnRequirements,
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
        SlNumberFormatter::refreshSlNumbersForYarnOrder((int) $yarnOrder->id);

        return response()->json(['data' => $yarnOrder->fresh()]);
    }

    public function destroy(YarnOrder $yarnOrder): JsonResponse
    {
        $yarnOrder->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
