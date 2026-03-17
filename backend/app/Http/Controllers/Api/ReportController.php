<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
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
