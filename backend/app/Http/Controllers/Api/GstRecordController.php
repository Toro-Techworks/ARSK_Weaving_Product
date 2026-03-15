<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\GstRecordResource;
use App\Models\GstRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GstRecordController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->input('per_page', 15);
        $records = GstRecord::with(['company', 'order'])
            ->when($request->type, fn ($q) => $q->where('type', $request->type))
            ->when($request->date_from, fn ($q) => $q->whereDate('date', '>=', $request->date_from))
            ->when($request->date_to, fn ($q) => $q->whereDate('date', '<=', $request->date_to))
            ->orderBy('date', 'desc')
            ->paginate($perPage);

        return response()->json([
            'data' => GstRecordResource::collection($records),
            'meta' => [
                'current_page' => $records->currentPage(),
                'last_page' => $records->lastPage(),
                'per_page' => $records->perPage(),
                'total' => $records->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|in:in,out',
            'invoice_number' => 'nullable|string|max:100',
            'company_id' => 'nullable|exists:companies,id',
            'date' => 'required|date',
            'taxable_value' => 'required|numeric|min:0',
            'gst_percentage' => 'required|numeric|min:0|max:100',
            'description' => 'nullable|string',
        ]);

        $validated['gst_amount'] = round($validated['taxable_value'] * $validated['gst_percentage'] / 100, 2);
        $validated['total_amount'] = round($validated['taxable_value'] + $validated['gst_amount'], 2);

        $record = GstRecord::create($validated);
        return response()->json(['data' => new GstRecordResource($record->load(['company', 'order']))], 201);
    }

    public function show(GstRecord $gstRecord): JsonResponse
    {
        $gstRecord->load(['company']);
        return response()->json(['data' => new GstRecordResource($gstRecord)]);
    }

    public function update(Request $request, GstRecord $gstRecord): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'sometimes|required|in:in,out',
            'invoice_number' => 'nullable|string|max:100',
            'company_id' => 'nullable|exists:companies,id',
            'date' => 'sometimes|required|date',
            'taxable_value' => 'sometimes|required|numeric|min:0',
            'gst_percentage' => 'sometimes|required|numeric|min:0|max:100',
            'description' => 'nullable|string',
        ]);

        if (isset($validated['taxable_value']) || isset($validated['gst_percentage'])) {
            $taxable = $validated['taxable_value'] ?? $gstRecord->taxable_value;
            $pct = $validated['gst_percentage'] ?? $gstRecord->gst_percentage;
            $validated['gst_amount'] = round($taxable * $pct / 100, 2);
            $validated['total_amount'] = round($taxable + ($validated['gst_amount'] ?? 0), 2);
        }

        $gstRecord->update($validated);
        return response()->json(['data' => new GstRecordResource($gstRecord->fresh(['company']))]);
    }

    public function destroy(GstRecord $gstRecord): JsonResponse
    {
        $gstRecord->delete();
        return response()->json(['message' => 'GST record deleted successfully']);
    }
}
