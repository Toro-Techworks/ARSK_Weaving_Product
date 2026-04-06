<?php

namespace App\Http\Controllers\Api;

use App\Exports\ProductionMatrixXlsxExport;
use App\Http\Controllers\Controller;
use App\Http\Resources\ExpenseResource;
use App\Models\Expense;
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

    /**
     * GET /reports/client-expenses?date_from=&date_to=
     * Client-order (P.O.) expenses with design / size / meter / rate / amount; total_amount = sum(amount).
     */
    public function clientOrderExpenses(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from',
        ]);

        $from = $validated['date_from'];
        $to = $validated['date_to'];

        $base = Expense::query()
            ->where('expense_scope', Expense::SCOPE_CLIENT_ORDER)
            ->whereDate('date', '>=', $from)
            ->whereDate('date', '<=', $to);

        $totalAmount = (clone $base)->sum('amount');

        $rows = (clone $base)
            ->with(['yarnOrder:id,display_order_id,po_number,customer,order_from'])
            ->orderBy('date', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'period' => ['from' => $from, 'to' => $to],
            'total_amount' => round((float) $totalAmount, 2),
            'data' => ExpenseResource::collection($rows)->resolve(),
        ]);
    }
}
