<?php

namespace App\Http\Controllers\Api;

use App\Exports\LoomEfficiencyReportExport;
use App\Exports\OrderSummaryReportExport;
use App\Exports\ProductionMatrixXlsxExport;
use App\Exports\YarnConsumptionReportExport;
use App\Http\Controllers\Controller;
use App\Models\Loom;
use App\Support\ProductionMatrixReportBuilder;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Maatwebsite\Excel\Facades\Excel;

class ReportController extends Controller
{
    public function orderSummary(Request $request): JsonResponse
    {
        $from = $request->input('date_from', Carbon::now()->subDays(30)->format('Y-m-d'));
        $to = $request->input('date_to', Carbon::now()->format('Y-m-d'));
        $orderFrom = $request->input('order_from');

        $perPage = (int) $request->input('per_page', 50);
        $perPage = $perPage >= 1 && $perPage <= 200 ? $perPage : 50;
        $page = max(1, (int) $request->input('page', 1));

        $query = DB::table('yarn_orders as yo')
            ->whereBetween(DB::raw('DATE(yo.created_at)'), [$from, $to])
            ->when($orderFrom, fn ($q) => $q->where('yo.order_from', $orderFrom))
            ->select([
                DB::raw('DATE(yo.created_at) as date'),
                'yo.order_from',
                DB::raw('COUNT(*) as total_orders'),
            ])
            ->groupBy([DB::raw('DATE(yo.created_at)'), 'yo.order_from'])
            ->orderBy(DB::raw('DATE(yo.created_at)'), 'asc');

        $items = $query->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'period' => ['from' => $from, 'to' => $to],
            'filters' => ['order_from' => $orderFrom],
            'data' => $items->items(),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
            'summary' => [
                'total_orders' => (int) DB::table('yarn_orders as yo')
                    ->whereBetween(DB::raw('DATE(yo.created_at)'), [$from, $to])
                    ->when($orderFrom, fn ($q) => $q->where('yo.order_from', $orderFrom))
                    ->count(),
            ],
        ]);
    }

    public function loomEfficiency(Request $request): JsonResponse
    {
        $from = $request->input('date_from', Carbon::now()->startOfMonth()->format('Y-m-d'));
        $to = $request->input('date_to', Carbon::now()->format('Y-m-d'));
        $loomId = $request->input('loom_id');
        $perPage = (int) $request->input('per_page', 50);
        $perPage = $perPage >= 1 && $perPage <= 200 ? $perPage : 50;
        $page = max(1, (int) $request->input('page', 1));

        $query = DB::table('loom_entries as le')
            ->leftJoin('looms as l', 'l.id', '=', 'le.loom_id')
            ->whereBetween('le.date', [$from, $to])
            ->when($loomId, fn ($q) => $q->where('le.loom_id', $loomId))
            ->select([
                'le.loom_id',
                'l.loom_number',
                DB::raw('ROUND(SUM(le.meters_produced), 2) as total_meters_produced'),
                DB::raw('ROUND(SUM(le.rejected_meters), 2) as total_rejected'),
                DB::raw('ROUND(SUM(le.net_production), 2) as net_production'),
                DB::raw('CASE WHEN SUM(le.meters_produced) > 0 THEN ROUND((1 - SUM(le.rejected_meters) / SUM(le.meters_produced)) * 100, 2) ELSE NULL END as efficiency_percentage'),
                DB::raw('COUNT(DISTINCT le.date) as days_worked'),
            ])
            ->groupBy(['le.loom_id', 'l.loom_number'])
            ->orderBy('l.loom_number', 'asc');

        $items = $query->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'period' => ['from' => $from, 'to' => $to],
            'filters' => ['loom_id' => $loomId],
            'looms' => $items->items(),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
        ]);
    }

    public function orderSummaryExportExcel(Request $request)
    {
        $from = $request->input('date_from', Carbon::now()->subDays(30)->format('Y-m-d'));
        $to = $request->input('date_to', Carbon::now()->format('Y-m-d'));
        $orderFrom = $request->input('order_from');
        $items = $this->getOrderSummaryItems($from, $to, $orderFrom);

        return Excel::download(new OrderSummaryReportExport($items), 'order-summary-report.csv', \Maatwebsite\Excel\Excel::CSV);
    }

    public function orderSummaryExportPdf(Request $request): Response
    {
        $from = $request->input('date_from', Carbon::now()->subDays(30)->format('Y-m-d'));
        $to = $request->input('date_to', Carbon::now()->format('Y-m-d'));
        $orderFrom = $request->input('order_from');
        $items = $this->getOrderSummaryItems($from, $to, $orderFrom);
        $rows = '';
        foreach ($items as $it) {
            $rows .= '<tr><td style="padding:6px 8px;border:1px solid #e5e7eb;">'.e($it['date']).'</td><td style="padding:6px 8px;border:1px solid #e5e7eb;">'.e($it['order_from'] ?? '-').'</td><td style="padding:6px 8px;border:1px solid #e5e7eb;">'.e((string) $it['total_orders']).'</td></tr>';
        }
        $pdf = Pdf::loadHTML('<html><body><h2>Order Summary Report</h2><table style="width:100%;border-collapse:collapse;"><thead><tr><th style="padding:6px 8px;border:1px solid #e5e7eb;background:#f9fafb;">Date</th><th style="padding:6px 8px;border:1px solid #e5e7eb;background:#f9fafb;">Order From</th><th style="padding:6px 8px;border:1px solid #e5e7eb;background:#f9fafb;">Total Orders</th></tr></thead><tbody>'.$rows.'</tbody></table></body></html>')->setPaper('a4', 'landscape');

        return $pdf->download('order-summary-report.pdf');
    }

    public function loomEfficiencyExportExcel(Request $request)
    {
        $from = $request->input('date_from', Carbon::now()->startOfMonth()->format('Y-m-d'));
        $to = $request->input('date_to', Carbon::now()->format('Y-m-d'));
        $loomId = $request->input('loom_id');
        $items = $this->getLoomEfficiencyItems($from, $to, $loomId);

        return Excel::download(new LoomEfficiencyReportExport($items), 'loom-efficiency-report.csv', \Maatwebsite\Excel\Excel::CSV);
    }

    public function loomEfficiencyExportPdf(Request $request): Response
    {
        $from = $request->input('date_from', Carbon::now()->startOfMonth()->format('Y-m-d'));
        $to = $request->input('date_to', Carbon::now()->format('Y-m-d'));
        $loomId = $request->input('loom_id');
        $items = $this->getLoomEfficiencyItems($from, $to, $loomId);
        $rows = '';
        foreach ($items as $it) {
            $rows .= '<tr><td style="padding:6px 8px;border:1px solid #e5e7eb;">'.e($it['loom_number'] ?? '-').'</td><td style="padding:6px 8px;border:1px solid #e5e7eb;">'.e((string) $it['net_production']).'</td><td style="padding:6px 8px;border:1px solid #e5e7eb;">'.e($it['efficiency_percentage'] !== null ? (string) $it['efficiency_percentage'].'%' : '-').'</td><td style="padding:6px 8px;border:1px solid #e5e7eb;">'.e((string) $it['days_worked']).'</td></tr>';
        }
        $pdf = Pdf::loadHTML('<html><body><h2>Loom Efficiency Report</h2><table style="width:100%;border-collapse:collapse;"><thead><tr><th style="padding:6px 8px;border:1px solid #e5e7eb;background:#f9fafb;">Loom</th><th style="padding:6px 8px;border:1px solid #e5e7eb;background:#f9fafb;">Net Production</th><th style="padding:6px 8px;border:1px solid #e5e7eb;background:#f9fafb;">Efficiency</th><th style="padding:6px 8px;border:1px solid #e5e7eb;background:#f9fafb;">Days Worked</th></tr></thead><tbody>'.$rows.'</tbody></table></body></html>')->setPaper('a4', 'landscape');

        return $pdf->download('loom-efficiency-report.pdf');
    }

    /**
     * GET /reports/production
     * Filters:
     * - date_from, date_to (required for meaningful output)
     * - loom_id (optional)
     * - order_id (optional) => yarn_order_id
     * - shift (optional) => Day/Night
     */
    public function production(Request $request): JsonResponse
    {
        $from = $request->input('date_from');
        $to = $request->input('date_to');

        $from = $from ?: Carbon::now()->subDays(30)->format('Y-m-d');
        $to = $to ?: Carbon::now()->format('Y-m-d');

        $loomId = $request->input('loom_id');
        $orderId = $request->input('order_id');
        $shift = $request->input('shift');

        $perPage = (int) $request->input('per_page', 50);
        $perPage = $perPage >= 1 && $perPage <= 200 ? $perPage : 50;
        $page = (int) $request->input('page', 1);
        $page = max(1, $page);

        $query = $this->buildProductionReportQuery($from, $to, $loomId, $orderId, $shift);

        $items = $query->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'period' => ['from' => $from, 'to' => $to],
            'filters' => [
                'loom_id' => $loomId,
                'order_id' => $orderId,
                'shift' => $shift,
            ],
            'data' => $items->items(),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
        ]);
    }

    public function productionExportExcel(Request $request)
    {
        $from = $request->input('date_from') ?: Carbon::now()->subDays(30)->format('Y-m-d');
        $to = $request->input('date_to') ?: Carbon::now()->format('Y-m-d');

        $loomId = $request->input('loom_id');
        $orderId = $request->input('order_id');
        $shift = $request->input('shift');

        $items = $this->getProductionReportItems($from, $to, $loomId, $orderId, $shift);
        $allLooms = $this->activeLoomsForProductionMatrix($loomId);
        $bundle = ProductionMatrixReportBuilder::buildBundle($items, $from, $to, $allLooms);
        $spec = ProductionMatrixReportBuilder::excelMatrixSpec($bundle);

        return Excel::download(
            new ProductionMatrixXlsxExport($spec['rows'], $spec['merges']),
            'production-report.xlsx',
            \Maatwebsite\Excel\Excel::XLSX
        );
    }

    public function productionExportPdf(Request $request): Response
    {
        $from = $request->input('date_from') ?: Carbon::now()->subDays(30)->format('Y-m-d');
        $to = $request->input('date_to') ?: Carbon::now()->format('Y-m-d');

        $loomId = $request->input('loom_id');
        $orderId = $request->input('order_id');
        $shift = $request->input('shift');

        $items = $this->getProductionReportItems($from, $to, $loomId, $orderId, $shift);
        $allLooms = $this->activeLoomsForProductionMatrix($loomId);
        $bundle = ProductionMatrixReportBuilder::buildBundle($items, $from, $to, $allLooms);

        $filterLines = $this->productionMatrixFilterLines($from, $to, $loomId, $orderId, $shift);
        $html = ProductionMatrixReportBuilder::toHtmlDocument($bundle, $filterLines);
        $pdf = Pdf::loadHTML($html)->setPaper('a4', 'landscape');

        return $pdf->download('production-report.pdf');
    }

    public function yarnConsumptionOptions(Request $request): JsonResponse
    {
        $yarnTypeOptions = DB::table('yarn_receipts')->select('type as yarn_type')->distinct()->orderBy('type')->get();
        $countOptions = DB::table('yarn_receipts')->select('count')->distinct()->orderBy('count')->get();

        return response()->json([
            'yarn_types' => $yarnTypeOptions->pluck('yarn_type')->filter()->values(),
            'counts' => $countOptions->pluck('count')->filter()->values(),
        ]);
    }

    public function yarnConsumption(Request $request): JsonResponse
    {
        $from = $request->input('date_from');
        $to = $request->input('date_to');

        $from = $from ?: Carbon::now()->subDays(30)->format('Y-m-d');
        $to = $to ?: Carbon::now()->format('Y-m-d');

        $yarnType = $request->input('yarn_type');
        $count = $request->input('count');

        $perPage = (int) $request->input('per_page', 50);
        $perPage = $perPage >= 1 && $perPage <= 200 ? $perPage : 50;
        $page = max(1, (int) $request->input('page', 1));

        // Build receipts aggregate (issued) grouped by date + order + yarn attributes.
        $receiptsAgg = DB::table('yarn_receipts as r')
            ->select([
                'r.date as date',
                'r.yarn_order_id',
                'r.type as yarn_type',
                'r.count as count',
                'r.content as content',
                DB::raw('SUM(r.net_weight) as issued_qty'),
            ])
            ->whereBetween('r.date', [$from, $to])
            ->when($yarnType, fn ($q) => $q->where('r.type', $yarnType))
            ->when($count, fn ($q) => $q->where('r.count', $count))
            ->groupBy(['r.date', 'r.yarn_order_id', 'r.type', 'r.count', 'r.content']);

        // Build requirements aggregate (consumed) grouped by order + yarn attributes.
        $reqAgg = DB::table('yarn_requirements as yr')
            ->select([
                'yr.yarn_order_id',
                'yr.count as count',
                'yr.content as content',
                DB::raw('SUM(yr.required_weight) as consumed_qty'),
            ])
            ->groupBy(['yr.yarn_order_id', 'yr.count', 'yr.content']);

        $query = DB::query()
            ->fromSub($receiptsAgg, 'ri')
            ->leftJoinSub($reqAgg, 'ra', function ($join) {
                $join->on('ra.yarn_order_id', '=', 'ri.yarn_order_id')
                    ->on('ra.count', '=', 'ri.count')
                    ->on('ra.content', '=', 'ri.content');
            })
            ->select([
                'ri.date as date',
                'ri.yarn_type as yarn_type',
                'ri.count as count',
                DB::raw('ROUND(SUM(ri.issued_qty), 3) as issued_qty'),
                DB::raw('ROUND(SUM(COALESCE(ra.consumed_qty, 0)), 3) as consumed_qty'),
                DB::raw('ROUND(SUM(ri.issued_qty) - SUM(COALESCE(ra.consumed_qty, 0)), 3) as balance'),
                DB::raw('CASE WHEN SUM(ri.issued_qty) >= SUM(COALESCE(ra.consumed_qty, 0)) THEN 0 ELSE ROUND(SUM(COALESCE(ra.consumed_qty, 0)) - SUM(ri.issued_qty), 3) END as waste'),
            ])
            ->groupBy(['ri.date', 'ri.yarn_type', 'ri.count'])
            ->orderBy('ri.date', 'asc')
            ->orderBy('ri.yarn_type', 'asc');

        $items = $query->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'period' => ['from' => $from, 'to' => $to],
            'filters' => ['yarn_type' => $yarnType, 'count' => $count],
            'data' => $items->items(),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
        ]);
    }

    public function yarnConsumptionExportExcel(Request $request)
    {
        $from = $request->input('date_from') ?: Carbon::now()->subDays(30)->format('Y-m-d');
        $to = $request->input('date_to') ?: Carbon::now()->format('Y-m-d');

        $yarnType = $request->input('yarn_type');
        $count = $request->input('count');

        // Export needs all rows (avoid pagination).
        $items = $this->getYarnConsumptionItems($from, $to, $yarnType, $count);

        return Excel::download(new YarnConsumptionReportExport($items), 'yarn-consumption-report.csv', \Maatwebsite\Excel\Excel::CSV);
    }

    public function yarnConsumptionExportPdf(Request $request): Response
    {
        $from = $request->input('date_from') ?: Carbon::now()->subDays(30)->format('Y-m-d');
        $to = $request->input('date_to') ?: Carbon::now()->format('Y-m-d');

        $yarnType = $request->input('yarn_type');
        $count = $request->input('count');

        $items = $this->getYarnConsumptionItems($from, $to, $yarnType, $count);

        $html = $this->buildYarnConsumptionReportPdfHtml($items, $from, $to, $yarnType, $count);
        $pdf = Pdf::loadHTML($html)->setPaper('a4', 'landscape');

        return $pdf->download('yarn-consumption-report.pdf');
    }

    private function getProductionReportItems(string $from, string $to, $loomId, $orderId, $shift): array
    {
        return $this->buildProductionReportQuery($from, $to, $loomId, $orderId, $shift)
            ->get()
            ->map(fn ($row) => (array) $row)
            ->values()
            ->all();
    }

    /** Whether `loom_entries.yarn_order_id` exists (listing avoids stale hasColumn edge cases). */
    private function loomEntriesHasYarnOrderIdColumn(): bool
    {
        try {
            return in_array('yarn_order_id', Schema::getColumnListing('loom_entries'), true);
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * SQL expression for yarn order on a production row (not user input).
     * Supports DBs with order only on looms, only on entries, or both (COALESCE).
     */
    private function productionYarnOrderKeySql(): ?string
    {
        $entryHas = $this->loomEntriesHasYarnOrderIdColumn();
        $loomHas = Schema::hasColumn('looms', 'yarn_order_id');
        if ($entryHas && $loomHas) {
            return 'COALESCE(le.yarn_order_id, l.yarn_order_id)';
        }
        if ($entryHas) {
            return 'le.yarn_order_id';
        }
        if ($loomHas) {
            return 'l.yarn_order_id';
        }

        return null;
    }

    private function buildProductionReportQuery(string $from, string $to, $loomId, $orderId, $shift): \Illuminate\Database\Query\Builder
    {
        $keySql = $this->productionYarnOrderKeySql();
        $fabricsHasSl = false;
        try {
            $fabricsHasSl = Schema::hasColumn('fabrics', 'sl_number');
        } catch (\Throwable) {
        }

        $q = DB::table('loom_entries as le')
            ->leftJoin('looms as l', 'l.id', '=', 'le.loom_id')
            ->leftJoin('fabrics as f_sl', 'f_sl.id', '=', 'le.fabric_id');

        if ($keySql !== null) {
            $q->leftJoin('yarn_orders as yo', function ($join) use ($keySql) {
                $join->whereRaw("yo.id = ({$keySql})");
            });
        } else {
            $q->leftJoin('yarn_orders as yo', function ($join) {
                $join->whereRaw('0 = 1');
            });
        }

        $q->leftJoin('weavers as w1', 'w1.id', '=', 'le.weaver1_id')
            ->leftJoin('weavers as w2', 'w2.id', '=', 'le.weaver2_id')
            ->whereBetween('le.date', [$from, $to])
            ->when($loomId, fn ($q) => $q->where('le.loom_id', $loomId))
            ->when($orderId, function ($q) use ($keySql, $orderId) {
                if ($keySql !== null) {
                    $q->whereRaw("({$keySql}) = ?", [$orderId]);
                } else {
                    $q->whereRaw('0 = 1');
                }
            })
            ->when($shift, fn ($q) => $q->where('le.shift', $shift));

        $orderIdSelect = $keySql !== null
            ? DB::raw("({$keySql}) as order_id")
            : DB::raw('CAST(NULL AS UNSIGNED) as order_id');

        $groupOrderKey = $keySql !== null
            ? [DB::raw('('.$keySql.')')]
            : [DB::raw('CAST(NULL AS UNSIGNED)')];

        $groupBy = array_merge([
            'le.date',
            'le.loom_id',
            'l.loom_number',
            'le.fabric_id',
        ], $groupOrderKey, [
            'yo.order_from',
            'yo.customer',
            'le.shift',
            'le.weaver1_id',
            'le.weaver2_id',
            'w1.weaver_name',
            'w2.weaver_name',
        ]);

        $fabricSlSelect = $fabricsHasSl
            ? DB::raw('MAX(f_sl.sl_number) as fabric_sl')
            : DB::raw('CAST(NULL AS CHAR) as fabric_sl');

        return $q->select([
            'le.date as date',
            'le.loom_id as loom_id',
            'l.loom_number as loom_number',
            $orderIdSelect,
            'yo.order_from as order_from',
            'yo.customer as customer',
            DB::raw('MAX(f_sl.design) as fabric_type'),
            $fabricSlSelect,
            'le.shift as shift',
            'le.weaver1_id as weaver1_id',
            'le.weaver2_id as weaver2_id',
            'w1.weaver_name as weaver1_name',
            'w2.weaver_name as weaver2_name',
            DB::raw('SUM(le.meters_produced) as production_meters'),
            DB::raw('CASE WHEN SUM(le.meters_produced) > 0 THEN ROUND((1 - (SUM(le.rejected_meters) / SUM(le.meters_produced))) * 100, 2) ELSE NULL END as efficiency_percentage'),
        ])->groupBy($groupBy)->orderBy('le.date', 'asc');
    }

    /**
     * Same loom scope as {@see LoomController::list()} for parity with the on-screen matrix.
     *
     * @return array<int, array{id: int, loom_number: string}>|null
     */
    private function activeLoomsForProductionMatrix($loomId): ?array
    {
        $q = Loom::query()->select(['id', 'loom_number'])->where('status', 'Active')->orderBy('loom_number');
        if ($loomId) {
            $q->where('id', $loomId);
        }
        $rows = $q->get();
        if ($rows->isEmpty()) {
            return null;
        }

        return $rows->map(fn ($l) => ['id' => $l->id, 'loom_number' => (string) $l->loom_number])->all();
    }

    /** @return string[] */
    private function productionMatrixFilterLines(string $from, string $to, $loomId, $orderId, $shift): array
    {
        $lines = ['From: '.$from, 'To: '.$to];
        if ($loomId) {
            $lines[] = 'Loom ID: '.$loomId;
        }
        if ($orderId) {
            $lines[] = 'Order ID: '.$orderId;
        }
        if ($shift) {
            $lines[] = 'Shift: '.$shift;
        }

        return $lines;
    }

    private function getOrderSummaryItems(string $from, string $to, $orderFrom): array
    {
        return DB::table('yarn_orders as yo')
            ->whereBetween(DB::raw('DATE(yo.created_at)'), [$from, $to])
            ->when($orderFrom, fn ($q) => $q->where('yo.order_from', $orderFrom))
            ->select([
                DB::raw('DATE(yo.created_at) as date'),
                'yo.order_from',
                DB::raw('COUNT(*) as total_orders'),
            ])
            ->groupBy([DB::raw('DATE(yo.created_at)'), 'yo.order_from'])
            ->orderBy(DB::raw('DATE(yo.created_at)'), 'asc')
            ->get()
            ->map(fn ($r) => (array) $r)
            ->values()
            ->all();
    }

    private function getLoomEfficiencyItems(string $from, string $to, $loomId): array
    {
        return DB::table('loom_entries as le')
            ->leftJoin('looms as l', 'l.id', '=', 'le.loom_id')
            ->whereBetween('le.date', [$from, $to])
            ->when($loomId, fn ($q) => $q->where('le.loom_id', $loomId))
            ->select([
                'le.loom_id',
                'l.loom_number',
                DB::raw('ROUND(SUM(le.meters_produced), 2) as total_meters_produced'),
                DB::raw('ROUND(SUM(le.rejected_meters), 2) as total_rejected'),
                DB::raw('ROUND(SUM(le.net_production), 2) as net_production'),
                DB::raw('CASE WHEN SUM(le.meters_produced) > 0 THEN ROUND((1 - SUM(le.rejected_meters) / SUM(le.meters_produced)) * 100, 2) ELSE NULL END as efficiency_percentage'),
                DB::raw('COUNT(DISTINCT le.date) as days_worked'),
            ])
            ->groupBy(['le.loom_id', 'l.loom_number'])
            ->orderBy('l.loom_number', 'asc')
            ->get()
            ->map(fn ($r) => (array) $r)
            ->values()
            ->all();
    }

    private function getYarnConsumptionItems(string $from, string $to, $yarnType, $count): array
    {
        $receiptsAgg = DB::table('yarn_receipts as r')
            ->select([
                'r.date as date',
                'r.yarn_order_id',
                'r.type as yarn_type',
                'r.count as count',
                'r.content as content',
                DB::raw('SUM(r.net_weight) as issued_qty'),
            ])
            ->whereBetween('r.date', [$from, $to])
            ->when($yarnType, fn ($q) => $q->where('r.type', $yarnType))
            ->when($count, fn ($q) => $q->where('r.count', $count))
            ->groupBy(['r.date', 'r.yarn_order_id', 'r.type', 'r.count', 'r.content']);

        $reqAgg = DB::table('yarn_requirements as yr')
            ->select([
                'yr.yarn_order_id',
                'yr.count as count',
                'yr.content as content',
                DB::raw('SUM(yr.required_weight) as consumed_qty'),
            ])
            ->groupBy(['yr.yarn_order_id', 'yr.count', 'yr.content']);

        $query = DB::query()
            ->fromSub($receiptsAgg, 'ri')
            ->leftJoinSub($reqAgg, 'ra', function ($join) {
                $join->on('ra.yarn_order_id', '=', 'ri.yarn_order_id')
                    ->on('ra.count', '=', 'ri.count')
                    ->on('ra.content', '=', 'ri.content');
            })
            ->select([
                'ri.date as date',
                'ri.yarn_type as yarn_type',
                'ri.count as count',
                DB::raw('ROUND(SUM(ri.issued_qty), 3) as issued_qty'),
                DB::raw('ROUND(SUM(COALESCE(ra.consumed_qty, 0)), 3) as consumed_qty'),
                DB::raw('ROUND(SUM(ri.issued_qty) - SUM(COALESCE(ra.consumed_qty, 0)), 3) as balance'),
                DB::raw('CASE WHEN SUM(ri.issued_qty) >= SUM(COALESCE(ra.consumed_qty, 0)) THEN 0 ELSE ROUND(SUM(COALESCE(ra.consumed_qty, 0)) - SUM(ri.issued_qty), 3) END as waste'),
            ])
            ->groupBy(['ri.date', 'ri.yarn_type', 'ri.count'])
            ->orderBy('ri.date', 'asc')
            ->orderBy('ri.yarn_type', 'asc');

        return $query->get()->map(fn ($row) => (array) $row)->values()->all();
    }

    private function buildYarnConsumptionReportPdfHtml(array $items, string $from, string $to, $yarnType, $count): string
    {
        $filterBits = [
            'From: '.$from,
            'To: '.$to,
            $yarnType ? 'Yarn Type: '.$yarnType : null,
            $count ? 'Count: '.$count : null,
        ];
        $filterBits = array_values(array_filter($filterBits));

        $rowsHtml = '';
        foreach ($items as $it) {
            $rowsHtml .= '<tr>'
                .'<td style="padding:6px 8px;border:1px solid #e5e7eb;">'.htmlspecialchars((string) $it['date']).'</td>'
                .'<td style="padding:6px 8px;border:1px solid #e5e7eb;">'.htmlspecialchars((string) $it['yarn_type']).'</td>'
                .'<td style="padding:6px 8px;border:1px solid #e5e7eb;">'.htmlspecialchars((string) $it['count']).'</td>'
                .'<td style="padding:6px 8px;border:1px solid #e5e7eb;">'.htmlspecialchars((string) round((float) $it['issued_qty'], 3)).'</td>'
                .'<td style="padding:6px 8px;border:1px solid #e5e7eb;">'.htmlspecialchars((string) round((float) $it['consumed_qty'], 3)).'</td>'
                .'<td style="padding:6px 8px;border:1px solid #e5e7eb;">'.htmlspecialchars((string) round((float) $it['balance'], 3)).'</td>'
                .'<td style="padding:6px 8px;border:1px solid #e5e7eb;">'.htmlspecialchars((string) round((float) $it['waste'], 3)).'</td>'
                .'</tr>';
        }

        return '
        <html>
          <head><style>
            body{font-family: DejaVu Sans, Arial, sans-serif; font-size: 12px;}
            h2{margin:0 0 10px 0;}
            table{width:100%;border-collapse:collapse;}
            th{background:#f9fafb;border:1px solid #e5e7eb;padding:6px 8px;text-align:left;}
          </style></head>
          <body>
            <h2>Yarn Consumption Report</h2>
            <div style="margin-bottom:10px;color:#374151;">
              '.implode(' &nbsp; | &nbsp; ', array_map(fn ($b) => htmlspecialchars($b), $filterBits)).'
            </div>
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Yarn</th><th>Count</th><th>Issued</th><th>Consumed</th><th>Balance</th><th>Waste</th>
                </tr>
              </thead>
              <tbody>'.$rowsHtml.'</tbody>
            </table>
          </body>
        </html>';
    }
}
