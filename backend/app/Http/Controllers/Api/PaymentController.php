<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PaymentResource;
use App\Models\GenericCode;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $this->clampPerPage($request, 10, 100);
        $payments = Payment::with(['company'])
            ->when($request->company_id, fn ($q) => $q->where('company_id', $request->company_id))
            ->when($request->date_from, fn ($q) => $q->whereDate('payment_date', '>=', $request->date_from))
            ->when($request->date_to, fn ($q) => $q->whereDate('payment_date', '<=', $request->date_to))
            ->orderBy('payment_date', 'desc')
            ->paginate($perPage);

        return $this->paginatedResponse(
            $payments,
            PaymentResource::collection($payments->items())->resolve()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'company_id' => 'required|exists:companies,id',
            'payment_date' => 'required|date',
            'amount' => 'required|numeric|min:0',
            'mode' => GenericCode::validationRule('payment_mode', true),
            'status' => GenericCode::sometimesValidationRule('payment_record_status'),
            'reference_number' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);

        $validated['status'] = $validated['status'] ?? Payment::STATUS_OPEN;
        $payment = Payment::create($validated);

        return response()->json(['data' => new PaymentResource($payment->load(['company', 'order']))], 201);
    }

    public function show(Payment $payment): JsonResponse
    {
        $payment->load(['company']);

        return response()->json(['data' => new PaymentResource($payment)]);
    }

    public function update(Request $request, Payment $payment): JsonResponse
    {
        $validated = $request->validate([
            'company_id' => 'sometimes|required|exists:companies,id',
            'order_id' => 'nullable|exists:orders,id',
            'payment_date' => 'sometimes|required|date',
            'amount' => 'sometimes|required|numeric|min:0',
            'mode' => array_merge(['sometimes', 'required'], array_slice(GenericCode::validationRule('payment_mode', true), 1)),
            'status' => array_merge(['sometimes', 'required'], array_slice(GenericCode::validationRule('payment_record_status', true), 1)),
            'reference_number' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);

        $payment->update($validated);

        return response()->json(['data' => new PaymentResource($payment->fresh(['company']))]);
    }

    public function destroy(Payment $payment): JsonResponse
    {
        $payment->delete();

        return response()->json(['message' => 'Payment deleted successfully']);
    }
}
