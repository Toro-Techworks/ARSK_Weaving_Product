<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Loom;
use App\Models\LoomEntry;
use App\Models\Payment;
use App\Models\YarnOrder;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

class DashboardController extends Controller
{
    private const METERS_PER_RUNTIME_HOUR = 18.0;

    private const CACHE_KEY = 'api:dashboard:v2';

    private const CACHE_TTL_SECONDS = 45;

    public function index(Request $request): JsonResponse
    {
        $skipCache = $request->boolean('refresh');

        if ($skipCache) {
            Cache::forget(self::CACHE_KEY);
            $payload = $this->buildPayload();
            $payload['meta']['cached'] = false;
        } else {
            $payload = Cache::remember(self::CACHE_KEY, self::CACHE_TTL_SECONDS, fn () => $this->buildPayload());
        }

        return response()->json($payload);
    }

    private function buildPayload(): array
    {
        $today = Carbon::today();

        $todayProduction = (float) LoomEntry::whereDate('date', $today)->sum('net_production');
        $activeLooms = (int) Loom::where('status', 'Active')->count();
        $totalLooms = (int) Loom::count();
        $yarnOrdersCount = (int) YarnOrder::count();

        $dailyProduction = LoomEntry::query()
            ->selectRaw('date as entry_date, SUM(net_production) as total_meters')
            ->whereBetween('date', [$today->copy()->subDays(6), $today])
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn ($r) => [
                'date' => Carbon::parse($r->entry_date)->format('Y-m-d'),
                'meters' => (float) $r->total_meters,
            ])
            ->values()
            ->all();

        $weekStart = $today->copy()->subDays(6)->startOfDay();
        $weekEnd = $today->copy()->endOfDay();
        $weekNetProduction = (float) LoomEntry::whereBetween('date', [$weekStart, $weekEnd])->sum('net_production');
        $estimatedRuntimeHours = (int) round($weekNetProduction / self::METERS_PER_RUNTIME_HOUR);

        $prevWeekStart = $today->copy()->subDays(13)->startOfDay();
        $prevWeekEnd = $today->copy()->subDays(7)->endOfDay();
        $thisWeekMeters = (float) LoomEntry::whereBetween('date', [$weekStart, $weekEnd])->sum('net_production');
        $lastWeekMeters = (float) LoomEntry::whereBetween('date', [$prevWeekStart, $prevWeekEnd])->sum('net_production');
        $productionTrend = $this->computeTrendPercent($thisWeekMeters, $lastWeekMeters);

        $pendingQuery = Payment::query();
        if (Schema::hasColumn('payments', 'status')) {
            $pendingQuery->whereIn('status', ['open', 'running']);
        }
        $pendingPayments = (float) $pendingQuery->sum('amount');

        return [
            'kpis' => [
                'active_looms' => $activeLooms,
                'total_looms' => $totalLooms,
                'estimated_runtime_hours' => $estimatedRuntimeHours,
                'total_orders' => $yarnOrdersCount,
                'production_trend_percent' => $productionTrend['percent'],
                'production_trend_direction' => $productionTrend['direction'],
                'today_production' => round($todayProduction, 2),
                'pending_payments' => round($pendingPayments, 2),
            ],
            'charts' => [
                'profit_expense_month' => $this->buildProfitExpenseByMonth($today, 6),
                'profit_expense_week' => $this->buildProfitExpenseByDay($today, 7),
                'loom_distribution' => [
                    'month' => $this->buildLoomDonut(30),
                    'week' => $this->buildLoomDonut(7),
                ],
            ],
            'daily_production' => $dailyProduction,
            'meta' => [
                'generated_at' => now()->toIso8601String(),
                'cached' => true,
            ],
        ];
    }

    /**
     * @return array{percent: float|int, direction: string}
     */
    private function computeTrendPercent(float $current, float $previous): array
    {
        if ($previous > 0) {
            $pct = round((($current - $previous) / $previous) * 100);

            return [
                'percent' => $pct,
                'direction' => $pct > 0 ? 'up' : ($pct < 0 ? 'down' : 'neutral'),
            ];
        }
        if ($current > 0) {
            return ['percent' => 100, 'direction' => 'up'];
        }

        return ['percent' => 0, 'direction' => 'neutral'];
    }

    /**
     * @return list<array{name: string, profit: float, expenses: float}>
     */
    private function buildProfitExpenseByMonth(Carbon $today, int $monthCount): array
    {
        $out = [];
        for ($i = $monthCount - 1; $i >= 0; $i--) {
            $month = $today->copy()->subMonths($i)->startOfMonth();
            $end = $month->copy()->endOfMonth();
            $profit = (float) Payment::query()
                ->whereBetween('payment_date', [$month->toDateString(), $end->toDateString()])
                ->sum('amount');
            $expenses = (float) Expense::query()
                ->whereBetween('date', [$month->toDateString(), $end->toDateString()])
                ->sum('amount');
            $out[] = [
                'name' => $month->format('M'),
                'profit' => round($profit, 2),
                'expenses' => round($expenses, 2),
            ];
        }

        return $out;
    }

    /**
     * @return list<array{name: string, profit: float, expenses: float}>
     */
    private function buildProfitExpenseByDay(Carbon $today, int $days): array
    {
        $out = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $day = $today->copy()->subDays($i);
            $d = $day->toDateString();
            $profit = (float) Payment::whereDate('payment_date', $d)->sum('amount');
            $expenses = (float) Expense::whereDate('date', $d)->sum('amount');
            $out[] = [
                'name' => $day->format('D'),
                'profit' => round($profit, 2),
                'expenses' => round($expenses, 2),
            ];
        }

        return $out;
    }

    /**
     * @return array{running_pct: float, stopped_pct: float, failure_pct: float}
     */
    private function buildLoomDonut(int $failureWindowDays): array
    {
        $total = (int) Loom::count();
        $active = (int) Loom::where('status', 'Active')->count();

        $from = Carbon::today()->subDays(max(0, $failureWindowDays - 1))->startOfDay();
        $fromStr = $from->toDateString();
        $produced = (float) LoomEntry::query()->where('date', '>=', $fromStr)->sum('meters_produced');
        $rejected = (float) LoomEntry::query()->where('date', '>=', $fromStr)->sum('rejected_meters');

        $failurePct = $produced > 0
            ? round(min(40.0, ($rejected / $produced) * 100), 1)
            : 0.0;

        if ($total <= 0) {
            return [
                'running_pct' => 0.0,
                'stopped_pct' => 0.0,
                'failure_pct' => round($failurePct, 1),
            ];
        }

        $remaining = max(0.0, 100.0 - $failurePct);
        $runningPct = round(($active / $total) * $remaining, 1);
        $stoppedPct = round($remaining - $runningPct, 1);

        return [
            'running_pct' => $runningPct,
            'stopped_pct' => $stoppedPct,
            'failure_pct' => round($failurePct, 1),
        ];
    }
}
