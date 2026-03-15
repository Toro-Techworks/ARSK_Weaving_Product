<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GstRecord;
use App\Models\Loom;
use App\Models\LoomEntry;
use App\Models\Payment;
use App\Models\YarnOrder;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $today = Carbon::today();

        $todayProduction = (float) LoomEntry::whereDate('date', $today)->sum('net_production');
        $activeLooms = Loom::where('status', 'Active')->count();
        $runningOrders = Order::where('status', 'Running')->count();

        $ordersTotal = Order::whereIn('status', ['Pending', 'Running'])->sum('grand_total');
        $paymentsTotal = Payment::whereIn('company_id', Order::select('company_id')->whereIn('status', ['Pending', 'Running']))->sum('amount');
        $pendingPayments = max(0, $ordersTotal - $paymentsTotal);

        $gstOut = (float) GstRecord::where('type', 'out')->sum('gst_amount');
        $gstIn = (float) GstRecord::where('type', 'in')->sum('gst_amount');
        $gstPayable = max(0, $gstOut - $gstIn);

        $dailyProduction = LoomEntry::query()
            ->select(DB::raw('date as entry_date'), DB::raw('SUM(net_production) as total_meters'))
            ->whereBetween('date', [$today->copy()->subDays(6), $today])
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn ($r) => [
                'date' => Carbon::parse($r->entry_date)->format('Y-m-d'),
                'meters' => (float) $r->total_meters,
            ]);

        return response()->json([
            'today_production' => round($todayProduction, 2),
            'active_looms' => $activeLooms,
            'pending_payments' => 0,
            'gst_payable' => round($gstPayable, 2),
            'running_orders' => $yarnOrdersCount,
            'daily_production' => $dailyProduction,
        ]);
    }
}
