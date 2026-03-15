<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\YarnReceipt;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class YarnReceiptController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->input('per_page', 50);
        $perPage = $perPage >= 1 && $perPage <= 100 ? $perPage : 50;
        $query = YarnReceipt::query()->orderBy('date', 'desc')->orderBy('id', 'desc');
        if ($request->filled('yarn_order_id')) {
            $query->where('yarn_order_id', $request->input('yarn_order_id'));
        } else {
            $query->with('yarnOrder');
        }
        $receipts = $query->paginate($perPage);
        return response()->json([
            'data' => $receipts->items(),
            'meta' => [
                'current_page' => $receipts->currentPage(),
                'last_page' => $receipts->lastPage(),
                'per_page' => $receipts->perPage(),
                'total' => $receipts->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'yarn_order_id' => 'nullable|exists:yarn_orders,id',
            'dc_no' => 'nullable|string|max:64',
            'vehicle_details' => 'nullable|string|max:255',
            'date' => 'nullable|date',
            'yarn' => 'nullable|string|max:128',
            'count' => 'nullable|string|max:64',
            'content' => 'nullable|string|max:128',
            'colour' => 'nullable|string|max:64',
            'type' => 'nullable|string|in:Cone,Hank',
            'no_of_bags' => 'nullable|integer|min:0',
            'bundles' => 'nullable|integer|min:0',
            'knots' => 'nullable|integer|min:0',
            'net_weight' => 'nullable|numeric|min:0',
            'gross_weight' => 'nullable|numeric|min:0',
        ]);
        $receipt = YarnReceipt::create($validated);
        return response()->json(['data' => $receipt], 201);
    }

    public function show(YarnReceipt $yarnReceipt): JsonResponse
    {
        return response()->json(['data' => $yarnReceipt]);
    }

    public function update(Request $request, YarnReceipt $yarnReceipt): JsonResponse
    {
        $validated = $request->validate([
            'yarn_order_id' => 'nullable|exists:yarn_orders,id',
            'dc_no' => 'nullable|string|max:64',
            'vehicle_details' => 'nullable|string|max:255',
            'date' => 'nullable|date',
            'yarn' => 'nullable|string|max:128',
            'count' => 'nullable|string|max:64',
            'content' => 'nullable|string|max:128',
            'colour' => 'nullable|string|max:64',
            'type' => 'nullable|string|in:Cone,Hank',
            'no_of_bags' => 'nullable|integer|min:0',
            'bundles' => 'nullable|integer|min:0',
            'knots' => 'nullable|integer|min:0',
            'net_weight' => 'nullable|numeric|min:0',
            'gross_weight' => 'nullable|numeric|min:0',
        ]);
        $yarnReceipt->update($validated);
        return response()->json(['data' => $yarnReceipt->fresh()]);
    }

    public function destroy(YarnReceipt $yarnReceipt): JsonResponse
    {
        $yarnReceipt->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
