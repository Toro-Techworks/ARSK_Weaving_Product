<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Loom;
use App\Models\LoomEntry;
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
        $yarnOrdersCount = YarnOrder::count();

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
            'running_orders' => $yarnOrdersCount,
            'daily_production' => $dailyProduction,
        ]);
    }
}
