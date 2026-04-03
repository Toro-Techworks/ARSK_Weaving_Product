<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GenericCode;
use App\Models\YarnReceipt;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class YarnReceiptController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $this->clampPerPage($request, 10, 100);
        $query = YarnReceipt::query()->orderBy('date', 'desc')->orderBy('id', 'desc');
        if ($request->filled('yarn_order_id')) {
            $query->where('yarn_order_id', $request->input('yarn_order_id'));
        } else {
            $query->with('yarnOrder');
        }
        $receipts = $query->paginate($perPage);

        return $this->paginatedResponse($receipts, $receipts->items());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'yarn_order_id' => 'nullable|exists:yarn_orders,id',
            'dc_no' => 'nullable|string|max:64',
            'vehicle_details' => 'nullable|string|max:255',
            'date' => 'nullable|date',
            'count' => GenericCode::validationRule('yarn_receipt_count', false, GenericCode::DROPDOWN_TYPE_MASTER, 64),
            'content' => GenericCode::validationRule('yarn_receipt_content', false, GenericCode::DROPDOWN_TYPE_MASTER, 128),
            'colour' => GenericCode::validationRule('yarn_colour', false, GenericCode::DROPDOWN_TYPE_MASTER, 64),
            'type' => GenericCode::validationRule('yarn_receipt_type'),
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
            'count' => GenericCode::validationRule('yarn_receipt_count', false, GenericCode::DROPDOWN_TYPE_MASTER, 64),
            'content' => GenericCode::validationRule('yarn_receipt_content', false, GenericCode::DROPDOWN_TYPE_MASTER, 128),
            'colour' => GenericCode::validationRule('yarn_colour', false, GenericCode::DROPDOWN_TYPE_MASTER, 64),
            'type' => GenericCode::validationRule('yarn_receipt_type'),
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

    /**
     * Replace all yarn receipts for an order with the given list (bulk sync).
     * Body: { yarn_order_id: int, yarn_receipts: [{ dc_no, vehicle_details, date, count, ... }, ...] }
     */
    public function bulkStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'yarn_order_id' => 'required|exists:yarn_orders,id',
            'yarn_receipts' => 'required|array',
            'yarn_receipts.*.dc_no' => 'nullable|string|max:64',
            'yarn_receipts.*.vehicle_details' => 'nullable|string|max:255',
            'yarn_receipts.*.date' => 'nullable|date',
            'yarn_receipts.*.count' => GenericCode::validationRule('yarn_receipt_count', false, GenericCode::DROPDOWN_TYPE_MASTER, 64),
            'yarn_receipts.*.content' => GenericCode::validationRule('yarn_receipt_content', false, GenericCode::DROPDOWN_TYPE_MASTER, 128),
            'yarn_receipts.*.colour' => GenericCode::validationRule('yarn_colour', false, GenericCode::DROPDOWN_TYPE_MASTER, 64),
            'yarn_receipts.*.type' => GenericCode::validationRule('yarn_receipt_type'),
            'yarn_receipts.*.no_of_bags' => 'nullable|integer|min:0',
            'yarn_receipts.*.bundles' => 'nullable|integer|min:0',
            'yarn_receipts.*.knots' => 'nullable|integer|min:0',
            'yarn_receipts.*.net_weight' => 'nullable|numeric|min:0',
            'yarn_receipts.*.gross_weight' => 'nullable|numeric|min:0',
        ]);

        $yarnOrderId = (int) $validated['yarn_order_id'];
        $rows = $validated['yarn_receipts'];

        YarnReceipt::where('yarn_order_id', $yarnOrderId)->delete();

        $created = [];
        YarnReceipt::withoutEvents(function () use ($rows, $yarnOrderId, &$created) {
            foreach ($rows as $row) {
                $receipt = YarnReceipt::create([
                    'yarn_order_id' => $yarnOrderId,
                    'dc_no' => $row['dc_no'] ?? null,
                    'vehicle_details' => $row['vehicle_details'] ?? null,
                    'date' => $row['date'] ?? null,
                    'count' => $row['count'] ?? null,
                    'content' => $row['content'] ?? null,
                    'colour' => $row['colour'] ?? null,
                    'type' => $row['type'] ?? null,
                    'no_of_bags' => isset($row['no_of_bags']) ? (int) $row['no_of_bags'] : null,
                    'bundles' => isset($row['bundles']) ? (int) $row['bundles'] : null,
                    'knots' => isset($row['knots']) ? (int) $row['knots'] : null,
                    'net_weight' => isset($row['net_weight']) ? (float) $row['net_weight'] : null,
                    'gross_weight' => isset($row['gross_weight']) ? (float) $row['gross_weight'] : null,
                ]);
                $created[] = $receipt;
            }
        });

        log_audit('yarn_receipts', 'update', $yarnOrderId, 'Bulk replaced '.count($created).' yarn receipt(s) for order #'.$yarnOrderId);

        return response()->json(['data' => $created, 'message' => count($created).' receipt(s) saved'], 201);
    }
}
