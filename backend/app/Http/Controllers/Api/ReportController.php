<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GstRecord;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function gstSummary(Request $request): JsonResponse
    {
        $from = $request->input('date_from', Carbon::now()->startOfMonth()->format('Y-m-d'));
        $to = $request->input('date_to', Carbon::now()->format('Y-m-d'));

        $in = GstRecord::where('type', 'in')
            ->whereBetween('date', [$from, $to])
            ->selectRaw('SUM(taxable_value) as taxable, SUM(gst_amount) as gst, SUM(total_amount) as total')
            ->first();
        $out = GstRecord::where('type', 'out')
            ->whereBetween('date', [$from, $to])
            ->selectRaw('SUM(taxable_value) as taxable, SUM(gst_amount) as gst, SUM(total_amount) as total')
            ->first();

        return response()->json([
            'period' => ['from' => $from, 'to' => $to],
            'gst_in' => [
                'taxable_value' => (float) ($in->taxable ?? 0),
                'gst_amount' => (float) ($in->gst ?? 0),
                'total_amount' => (float) ($in->total ?? 0),
            ],
            'gst_out' => [
                'taxable_value' => (float) ($out->taxable ?? 0),
                'gst_amount' => (float) ($out->gst ?? 0),
                'total_amount' => (float) ($out->total ?? 0),
            ],
            'payable' => max(0, (float) ($out->gst ?? 0) - (float) ($in->gst ?? 0)),
        ]);
    }

    public function orderSummary(Request $request): JsonResponse
    {
        $from = $request->input('date_from');
        $to = $request->input('date_to');

        $query = \App\Models\YarnOrder::query()
            ->when($from, fn ($q) => $q->whereDate('created_at', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('created_at', '<=', $to));

        $totalOrders = $query->count();

        return response()->json([
            'period' => ['from' => $from, 'to' => $to],
            'total_orders' => $totalOrders,
            'by_status' => [],
            'grand_total' => 0,
        ]);
    }

    public function loomEfficiency(Request $request): JsonResponse
    {
        $from = $request->input('date_from', Carbon::now()->startOfMonth()->format('Y-m-d'));
        $to = $request->input('date_to', Carbon::now()->format('Y-m-d'));

        $entries = \App\Models\LoomEntry::with('loom:id,loom_number')
            ->select(['id', 'loom_id', 'date', 'meters_produced', 'rejected_meters', 'net_production'])
            ->whereBetween('date', [$from, $to])
            ->get();

        $byLoom = $entries->groupBy('loom_id')->map(function ($items, $loomId) {
            $loom = $items->first()->loom;
            $totalProduced = $items->sum('meters_produced');
            $totalRejected = $items->sum('rejected_meters');
            $net = $items->sum('net_production');
            $efficiency = $totalProduced > 0
                ? round((1 - $totalRejected / $totalProduced) * 100, 2)
                : null;
            return [
                'loom_id' => (int) $loomId,
                'loom_number' => $loom?->loom_number,
                'total_meters_produced' => round($totalProduced, 2),
                'total_rejected' => round($totalRejected, 2),
                'net_production' => round($net, 2),
                'efficiency_percentage' => $efficiency,
                'days_worked' => $items->groupBy(fn ($e) => $e->date->format('Y-m-d'))->count(),
            ];
        })->values();

        return response()->json([
            'period' => ['from' => $from, 'to' => $to],
            'looms' => $byLoom,
        ]);
    }
}
