<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ExpenseResource;
use App\Models\Expense;
use App\Models\GenericCode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ExpenseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $this->clampPerPage($request, 10, 100);
        $expenses = Expense::query()
            ->with(['yarnOrder:id,display_order_id,po_number,customer,order_from'])
            ->when($request->category, fn ($q) => $q->where('category', $request->category))
            ->when($request->expense_scope, fn ($q) => $q->where('expense_scope', $request->expense_scope))
            ->when($request->yarn_order_id, fn ($q) => $q->where('yarn_order_id', $request->yarn_order_id))
            ->when($request->date_from, fn ($q) => $q->whereDate('date', '>=', $request->date_from))
            ->when($request->date_to, fn ($q) => $q->whereDate('date', '<=', $request->date_to))
            ->orderBy('date', 'desc')
            ->orderBy('id', 'desc')
            ->paginate($perPage);

        return $this->paginatedResponse(
            $expenses,
            ExpenseResource::collection($expenses->items())->resolve()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $scope = $request->input('expense_scope');

        $rules = [
            'expense_scope' => ['required', Rule::in([Expense::SCOPE_TEXTILE, Expense::SCOPE_CLIENT_ORDER])],
            'category' => GenericCode::validationRule('expense_category', true, GenericCode::DROPDOWN_TYPE_MASTER),
            'date' => 'required|date',
            'notes' => 'nullable|string',
            'yarn_order_id' => [
                'nullable',
                Rule::requiredIf($scope === Expense::SCOPE_CLIENT_ORDER),
                'exists:yarn_orders,id',
            ],
        ];

        if ($scope === Expense::SCOPE_TEXTILE) {
            $rules['amount'] = 'required|numeric|min:0';
        } else {
            $rules['design'] = 'required|string|max:255';
            $rules['size'] = 'required|string|max:255';
            $rules['meter'] = 'required|numeric|min:0';
            $rules['rate_per_meter'] = 'required|numeric|min:0';
        }

        $validated = $request->validate($rules);

        if (($validated['expense_scope'] ?? '') === Expense::SCOPE_TEXTILE) {
            $validated['yarn_order_id'] = null;
            $validated['design'] = null;
            $validated['size'] = null;
            $validated['meter'] = null;
            $validated['rate_per_meter'] = null;
        } else {
            $validated['amount'] = round((float) $validated['meter'] * (float) $validated['rate_per_meter'], 2);
        }

        $expense = Expense::create($validated);
        $expense->load(['yarnOrder:id,display_order_id,po_number,customer,order_from']);

        return response()->json(['data' => new ExpenseResource($expense)], 201);
    }

    public function show(Expense $expense): JsonResponse
    {
        $expense->load(['yarnOrder:id,display_order_id,po_number,customer,order_from']);

        return response()->json(['data' => new ExpenseResource($expense)]);
    }

    public function update(Request $request, Expense $expense): JsonResponse
    {
        $scope = $request->input('expense_scope', $expense->expense_scope);

        $rules = [
            'expense_scope' => ['sometimes', 'required', Rule::in([Expense::SCOPE_TEXTILE, Expense::SCOPE_CLIENT_ORDER])],
            'category' => array_merge(['sometimes', 'required'], array_slice(GenericCode::validationRule('expense_category', true, GenericCode::DROPDOWN_TYPE_MASTER), 1)),
            'date' => 'sometimes|required|date',
            'notes' => 'nullable|string',
            'yarn_order_id' => ['nullable', 'exists:yarn_orders,id'],
            'design' => 'nullable|string|max:255',
            'size' => 'nullable|string|max:255',
            'meter' => 'nullable|numeric|min:0',
            'rate_per_meter' => 'nullable|numeric|min:0',
            'amount' => 'nullable|numeric|min:0',
        ];

        $validated = $request->validate($rules);

        $scope = $validated['expense_scope'] ?? $expense->expense_scope;

        $yarnOrderId = array_key_exists('yarn_order_id', $validated)
            ? $validated['yarn_order_id']
            : $expense->yarn_order_id;

        if ($scope === Expense::SCOPE_CLIENT_ORDER && empty($yarnOrderId)) {
            throw ValidationException::withMessages([
                'yarn_order_id' => ['A yarn order is required for client-order expenses.'],
            ]);
        }

        if ($scope === Expense::SCOPE_TEXTILE) {
            if ($request->has('expense_scope') || $expense->expense_scope !== Expense::SCOPE_TEXTILE) {
                $validated['yarn_order_id'] = null;
                $validated['design'] = null;
                $validated['size'] = null;
                $validated['meter'] = null;
                $validated['rate_per_meter'] = null;
            }
            if (array_key_exists('amount', $validated) && $validated['amount'] === null) {
                unset($validated['amount']);
            }
        } else {
            $design = $validated['design'] ?? $expense->design;
            $size = $validated['size'] ?? $expense->size;
            $meter = $validated['meter'] ?? $expense->meter;
            $rate = $validated['rate_per_meter'] ?? $expense->rate_per_meter;

            if ($design === null || $design === '' || $size === null || $size === ''
                || $meter === null || $rate === null) {
                throw ValidationException::withMessages([
                    'design' => ['Design, size, meter, and rate per meter are required for client-order expenses.'],
                ]);
            }

            $validated['design'] = $design;
            $validated['size'] = $size;
            $validated['meter'] = $meter;
            $validated['rate_per_meter'] = $rate;
            $validated['amount'] = round((float) $meter * (float) $rate, 2);
        }

        $expense->update($validated);
        $expense->load(['yarnOrder:id,display_order_id,po_number,customer,order_from']);

        return response()->json(['data' => new ExpenseResource($expense->fresh())]);
    }

    public function destroy(Expense $expense): JsonResponse
    {
        $expense->delete();

        return response()->json(['message' => 'Expense deleted successfully']);
    }
}
