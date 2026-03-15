<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->input('per_page', 15);
        $orders = Order::with(['company', 'loom'])
            ->when($request->search, fn ($q) => $q->where('dc_number', 'like', "%{$request->search}%")
                ->orWhere('fabric_type', 'like', "%{$request->search}%"))
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->company_id, fn ($q) => $q->where('company_id', $request->company_id))
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'data' => OrderResource::collection($orders),
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
            'company_id' => 'required|exists:companies,id',
            'fabric_type' => 'required|string|max:255',
            'quantity_meters' => 'required|numeric|min:0',
            'rate_per_meter' => 'required|numeric|min:0',
            'loom_id' => 'required|exists:looms,id',
            'order_from' => 'nullable|string|max:255',
            'customer' => 'nullable|string|max:255',
            'weaving_unit' => 'nullable|string|max:255',
            'po_number' => 'nullable|string|max:64',
            'po_date' => 'nullable|date',
            'delivery_date' => 'required|date',
            'status' => 'nullable|in:Pending,Running,Completed',
            'gst_percentage' => 'nullable|numeric|min:0|max:100',
        ]);

        $validated['gst_percentage'] = $validated['gst_percentage'] ?? 12;
        $validated['status'] = $validated['status'] ?? 'Pending';

        $order = Order::create($validated);
        return response()->json(['data' => new OrderResource($order->load(['company', 'loom']))], 201);
    }

    public function show(Order $order): JsonResponse
    {
        $order->load(['company', 'loom']);
        return response()->json(['data' => new OrderResource($order)]);
    }

    public function update(Request $request, Order $order): JsonResponse
    {
        $validated = $request->validate([
            'company_id' => 'sometimes|required|exists:companies,id',
            'fabric_type' => 'sometimes|required|string|max:255',
            'quantity_meters' => 'sometimes|required|numeric|min:0',
            'rate_per_meter' => 'sometimes|required|numeric|min:0',
            'loom_id' => 'sometimes|required|exists:looms,id',
            'order_from' => 'nullable|string|max:255',
            'customer' => 'nullable|string|max:255',
            'weaving_unit' => 'nullable|string|max:255',
            'po_number' => 'nullable|string|max:64',
            'po_date' => 'nullable|date',
            'delivery_date' => 'sometimes|required|date',
            'status' => 'nullable|in:Pending,Running,Completed',
            'gst_percentage' => 'nullable|numeric|min:0|max:100',
        ]);

        $order->update($validated);
        return response()->json(['data' => new OrderResource($order->fresh(['company', 'loom']))]);
    }

    public function destroy(Order $order): JsonResponse
    {
        $order->delete();
        return response()->json(['message' => 'Order deleted successfully']);
    }
}
