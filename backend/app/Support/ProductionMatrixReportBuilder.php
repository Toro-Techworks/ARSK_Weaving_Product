<?php

namespace App\Support;

use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;

/**
 * Builds the same production pivot/matrix model as frontend {@see frontend/src/utils/productionPivotReport.js}
 * for CSV/PDF export aligned with the Production matrix grid.
 */
class ProductionMatrixReportBuilder
{
    private const SHIFT_COLUMNS = ['Day', 'Night'];

    private static function round2(float $n): float
    {
        return round($n, 2);
    }

    public static function formatOrderLabel(mixed $orderId, ?string $rowDateYmd): string
    {
        if ($orderId === null || $orderId === '') {
            return '';
        }
        $year = (int) date('Y');
        if ($rowDateYmd && strlen((string) $rowDateYmd) >= 10) {
            try {
                $year = (int) Carbon::parse(substr((string) $rowDateYmd, 0, 10))->year;
            } catch (\Throwable) {
            }
        }
        $yy = substr((string) $year, -2);
        $seq = str_pad((string) (int) $orderId, 5, '0', STR_PAD_LEFT);

        return 'AEWU'.$yy.$seq;
    }

    public static function makeDateShiftSlotKey(string $date, string $shift): string
    {
        return $date.'|'.$shift;
    }

    public static function canonicalizeShiftForPivot(?string $raw): ?string
    {
        $t = trim((string) $raw);
        if ($t === '' || $t === '—') {
            return null;
        }
        if (preg_match('/^day$/i', $t)) {
            return 'Day';
        }
        if (preg_match('/^night$/i', $t)) {
            return 'Night';
        }

        return null;
    }

    /** @return string[] */
    public static function enumerateDates(string $fromStr, string $toStr): array
    {
        if ($fromStr === '' || $toStr === '') {
            return [];
        }
        try {
            $from = Carbon::parse($fromStr)->startOfDay();
            $to = Carbon::parse($toStr)->startOfDay();
        } catch (\Throwable) {
            return [];
        }
        if ($from->gt($to)) {
            return [];
        }
        $out = [];
        for ($cur = $from->copy(); $cur->lte($to); $cur->addDay()) {
            $out[] = $cur->format('Y-m-d');
        }

        return $out;
    }

    /** @return array<int, array{key: string, date: string, shift: string}> */
    public static function buildDateShiftColumns(array $dates): array
    {
        $out = [];
        foreach ($dates as $d) {
            foreach (self::SHIFT_COLUMNS as $shift) {
                $out[] = [
                    'key' => self::makeDateShiftSlotKey($d, $shift),
                    'date' => $d,
                    'shift' => $shift,
                ];
            }
        }

        return $out;
    }

    public static function normalizeDateKey(mixed $d): string
    {
        if ($d === null) {
            return '';
        }
        $s = (string) $d;

        return strlen($s) >= 10 ? substr($s, 0, 10) : $s;
    }

    public static function normalizeLoomId(mixed $id): string|int|null
    {
        if ($id === null || $id === '') {
            return null;
        }
        if (is_numeric($id)) {
            return (int) $id;
        }

        return (string) $id;
    }

    /** @param  array<string, float|int|null>  $shiftMtrVals */
    public static function computeDateTotalsFromSlots(array $dates, array $shiftMtrVals): array
    {
        $dateTotalVals = [];
        foreach ($dates as $d) {
            $sum = 0.0;
            foreach (self::SHIFT_COLUMNS as $sh) {
                $k = self::makeDateShiftSlotKey($d, $sh);
                $v = $shiftMtrVals[$k] ?? null;
                if ($v !== null && $v > 0) {
                    $sum += (float) $v;
                }
            }
            $dateTotalVals[$d] = $sum > 0 ? self::round2($sum) : null;
        }

        return $dateTotalVals;
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @param  array<int, array{id: mixed, loom_number?: string}>|null  $allLooms
     * @return array{
     *     dates: string[],
     *     dateShiftColumns: array<int, array{key: string, date: string, shift: string}>,
     *     loomBlocks: array<int, array{loomId: string|int, loomNumber: string, orderId: array<string, string>, slNo: array<string, string>, shiftMtr: array<string, float|null>, dateTotal: array<string, float|null>}>
     * }
     */
    public static function transformProductionToPivotModel(array $rows, array $dates, ?array $allLooms = null): array
    {
        $dateSet = array_fill_keys($dates, true);
        $dateShiftColumns = self::buildDateShiftColumns($dates);
        $slotSet = [];
        foreach ($dateShiftColumns as $c) {
            $slotSet[$c['key']] = true;
        }

        /** @var array<string|int, array{loom_number: string, bySlot: array<string, array{orderLabels: array<string, true>, slLabels: array<string, true>, meters: float}>}> $byLoom */
        $byLoom = [];

        foreach ($rows as $r) {
            $lid = self::normalizeLoomId($r['loom_id'] ?? null);
            if ($lid === null) {
                continue;
            }
            $dk = self::normalizeDateKey($r['date'] ?? null);
            if (! isset($dateSet[$dk])) {
                continue;
            }
            $colShift = self::canonicalizeShiftForPivot(isset($r['shift']) ? (string) $r['shift'] : null);
            if ($colShift === null) {
                continue;
            }
            $slotKey = self::makeDateShiftSlotKey($dk, $colShift);
            if (! isset($slotSet[$slotKey])) {
                continue;
            }

            if (! isset($byLoom[$lid])) {
                $byLoom[$lid] = [
                    'loom_number' => isset($r['loom_number']) ? (string) $r['loom_number'] : (string) $lid,
                    'bySlot' => [],
                ];
            }
            $loom = &$byLoom[$lid];
            if (! isset($loom['bySlot'][$slotKey])) {
                $loom['bySlot'][$slotKey] = [
                    'orderLabels' => [],
                    'slLabels' => [],
                    'meters' => 0.0,
                ];
            }
            $cell = &$loom['bySlot'][$slotKey];
            $ol = self::formatOrderLabel($r['order_id'] ?? null, $dk);
            if ($ol !== '') {
                $cell['orderLabels'][$ol] = true;
            }
            $sl = isset($r['fabric_sl']) ? trim((string) $r['fabric_sl']) : '';
            if ($sl !== '') {
                $cell['slLabels'][$sl] = true;
            }
            $cell['meters'] += (float) ($r['production_meters'] ?? 0);
            unset($cell, $loom);
        }

        if ($allLooms !== null && count($allLooms) > 0) {
            foreach ($allLooms as $l) {
                $lid = self::normalizeLoomId($l['id'] ?? null);
                if ($lid === null) {
                    continue;
                }
                $name = isset($l['loom_number']) ? (string) $l['loom_number'] : (string) $lid;
                if (! isset($byLoom[$lid])) {
                    $byLoom[$lid] = ['loom_number' => $name, 'bySlot' => []];
                } else {
                    $byLoom[$lid]['loom_number'] = $name;
                }
            }
        }

        if ($allLooms !== null && count($allLooms) > 0) {
            $listMap = [];
            foreach ($allLooms as $l) {
                $lid = self::normalizeLoomId($l['id'] ?? null);
                if ($lid === null) {
                    continue;
                }
                $listMap[$lid] = (string) ($l['loom_number'] ?? $lid);
            }
            $listed = array_keys($listMap);
            usort($listed, function ($a, $b) use ($listMap) {
                return strnatcasecmp($listMap[$a], $listMap[$b]);
            });
            $extras = [];
            foreach (array_keys($byLoom) as $id) {
                if (! array_key_exists($id, $listMap)) {
                    $extras[] = $id;
                }
            }
            usort($extras, function ($a, $b) use ($byLoom) {
                return strnatcasecmp($byLoom[$a]['loom_number'], $byLoom[$b]['loom_number']);
            });
            $loomIds = array_merge($listed, $extras);
        } else {
            $loomIds = array_keys($byLoom);
            usort($loomIds, function ($a, $b) use ($byLoom) {
                return strnatcasecmp($byLoom[$a]['loom_number'], $byLoom[$b]['loom_number']);
            });
        }

        $loomBlocks = [];
        foreach ($loomIds as $loomId) {
            if (! isset($byLoom[$loomId])) {
                continue;
            }
            $entry = $byLoom[$loomId];
            $loom_number = $entry['loom_number'];
            $bySlot = $entry['bySlot'];

            $orderIdVals = [];
            $slNoVals = [];
            $shiftMtrVals = [];

            foreach ($dateShiftColumns as $col) {
                $key = $col['key'];
                $agg = $bySlot[$key] ?? null;
                if ($agg === null) {
                    $orderIdVals[$key] = '';
                    $slNoVals[$key] = '';
                    $shiftMtrVals[$key] = null;

                    continue;
                }
                $orderKeys = array_keys($agg['orderLabels']);
                sort($orderKeys);
                $orderIdVals[$key] = implode(', ', $orderKeys);
                $slKeys = array_keys($agg['slLabels']);
                sort($slKeys);
                $slNoVals[$key] = implode(', ', $slKeys);
                $shiftMtrVals[$key] = $agg['meters'] > 0 ? self::round2($agg['meters']) : null;
            }

            $dateTotalVals = self::computeDateTotalsFromSlots($dates, $shiftMtrVals);

            $loomBlocks[] = [
                'loomId' => $loomId,
                'loomNumber' => $loom_number,
                'orderId' => $orderIdVals,
                'slNo' => $slNoVals,
                'shiftMtr' => $shiftMtrVals,
                'dateTotal' => $dateTotalVals,
            ];
        }

        return [
            'dates' => $dates,
            'dateShiftColumns' => $dateShiftColumns,
            'loomBlocks' => $loomBlocks,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @param  array<int, array{id: mixed, loom_number?: string}>|null  $allLooms
     */
    public static function buildGlobalWeaverSlotLabels(array $rows, array $dateShiftColumns): array
    {
        $slotKeys = array_column($dateShiftColumns, 'key');
        $slotSet = array_fill_keys($slotKeys, true);
        $w1 = [];
        $w2 = [];
        foreach ($slotKeys as $k) {
            $w1[$k] = [];
            $w2[$k] = [];
        }

        foreach ($rows as $r) {
            $dk = self::normalizeDateKey($r['date'] ?? null);
            $colShift = self::canonicalizeShiftForPivot(isset($r['shift']) ? (string) $r['shift'] : null);
            if ($colShift === null) {
                continue;
            }
            $slotKey = self::makeDateShiftSlotKey($dk, $colShift);
            if (! isset($slotSet[$slotKey])) {
                continue;
            }
            $n1 = isset($r['weaver1_name']) ? trim((string) $r['weaver1_name']) : '';
            $n2 = isset($r['weaver2_name']) ? trim((string) $r['weaver2_name']) : '';
            if ($n1 !== '') {
                $w1[$slotKey][$n1] = true;
            }
            if ($n2 !== '') {
                $w2[$slotKey][$n2] = true;
            }
        }

        $weaver1 = [];
        $weaver2 = [];
        foreach ($slotKeys as $k) {
            $a1 = array_keys($w1[$k]);
            sort($a1);
            $weaver1[$k] = implode(', ', $a1);
            $a2 = array_keys($w2[$k]);
            sort($a2);
            $weaver2[$k] = implode(', ', $a2);
        }

        return ['weaver1' => $weaver1, 'weaver2' => $weaver2];
    }

    /** @param  array{dateShiftColumns: array, loomBlocks: array}  $model */
    public static function computeProductionSummaries(array $model): array
    {
        $dateShiftColumns = $model['dateShiftColumns'];
        $loomBlocks = $model['loomBlocks'];

        $totalMetersPerSlot = [];
        $activeLoomsPerSlot = [];
        $avgPerLoomPerSlot = [];

        foreach ($dateShiftColumns as $col) {
            $key = $col['key'];
            $sum = 0.0;
            $active = 0;
            foreach ($loomBlocks as $block) {
                $v = $block['shiftMtr'][$key] ?? null;
                if ($v !== null && $v > 0) {
                    $sum += (float) $v;
                    $active++;
                }
            }
            $totalMetersPerSlot[$key] = self::round2($sum);
            $activeLoomsPerSlot[$key] = $active;
            $avgPerLoomPerSlot[$key] = $active > 0 ? self::round2($sum / $active) : null;
        }

        return [
            'totalMetersPerSlot' => $totalMetersPerSlot,
            'activeLoomsPerSlot' => $activeLoomsPerSlot,
            'avgPerLoomPerSlot' => $avgPerLoomPerSlot,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @param  array<int, array{id: mixed, loom_number?: string}>|null  $allLooms
     */
    public static function buildBundle(array $rows, string $fromStr, string $toStr, ?array $allLooms = null): array
    {
        $dates = self::enumerateDates($fromStr, $toStr);
        if ($dates === []) {
            return [
                'dates' => [],
                'dateShiftColumns' => [],
                'loomBlocks' => [],
                'globalWeavers' => ['weaver1' => [], 'weaver2' => []],
                'summaries' => [
                    'totalMetersPerSlot' => [],
                    'activeLoomsPerSlot' => [],
                    'avgPerLoomPerSlot' => [],
                ],
            ];
        }
        $model = self::transformProductionToPivotModel($rows, $dates, $allLooms);
        $globalWeavers = self::buildGlobalWeaverSlotLabels($rows, $model['dateShiftColumns']);
        $summaries = self::computeProductionSummaries($model);

        return array_merge($model, [
            'globalWeavers' => $globalWeavers,
            'summaries' => $summaries,
        ]);
    }

    public static function formatDayHeader(string $ymd): string
    {
        try {
            $c = Carbon::parse($ymd);
        } catch (\Throwable) {
            return $ymd;
        }
        $months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        return sprintf('%02d %s', (int) $c->format('d'), $months[(int) $c->format('n') - 1]);
    }

    private static function fmtNum(mixed $v): string
    {
        if ($v === null || $v === '') {
            return '';
        }
        $n = (float) $v;
        if (! is_finite($n)) {
            return '';
        }
        $rounded = round($n, 2);
        if (abs($rounded - round($rounded)) < 1e-9) {
            return (string) (int) $rounded;
        }

        return (string) $rounded;
    }

    private static function xlCell(int $columnIndex1Based, int $row1Based): string
    {
        return Coordinate::stringFromColumnIndex($columnIndex1Based).$row1Based;
    }

    /**
     * Weaver + loom + footer rows (no header). Each row length = 2 + 2 * count(dates).
     *
     * @param  array  $bundle  from buildBundle()
     * @return array<int, array<int, string|int|float>>
     */
    public static function pivotBodyAndFooterRows(array $bundle): array
    {
        $dates = $bundle['dates'];
        $cols = $bundle['dateShiftColumns'];
        $width = 2 + 2 * count($dates);
        $pad = function (array $r) use ($width) {
            $r = array_values($r);
            while (count($r) < $width) {
                $r[] = '';
            }

            return array_slice($r, 0, $width);
        };

        $slotVals = function (callable $fn) use ($cols) {
            $r = [];
            foreach ($cols as $c) {
                $r[] = $fn($c);
            }

            return $r;
        };

        $out = [];
        $gw1 = $bundle['globalWeavers']['weaver1'];
        $gw2 = $bundle['globalWeavers']['weaver2'];

        $out[] = $pad(array_merge(['Weavers', 'Weaver 1'], $slotVals(fn ($c) => $gw1[$c['key']] ?? '')));
        $out[] = $pad(array_merge(['', 'Weaver 2'], $slotVals(fn ($c) => $gw2[$c['key']] ?? '')));

        foreach ($bundle['loomBlocks'] as $block) {
            $loom = $block['loomNumber'];
            $out[] = $pad(array_merge([$loom, 'Order ID'], $slotVals(fn ($c) => $block['orderId'][$c['key']] ?? '')));
            $out[] = $pad(array_merge(['', 'SL No'], $slotVals(fn ($c) => $block['slNo'][$c['key']] ?? '')));
            $out[] = $pad(array_merge(['', 'Shift Mtr'], $slotVals(fn ($c) => self::fmtNum($block['shiftMtr'][$c['key']] ?? null))));

            $totalCells = [];
            foreach ($dates as $d) {
                $totalCells[] = self::fmtNum($block['dateTotal'][$d] ?? null);
                $totalCells[] = '';
            }
            $out[] = $pad(array_merge([$loom, 'Total Mtr (day)'], $totalCells));
        }

        $sum = $bundle['summaries'];
        $out[] = $pad(array_merge(['Total shift m', ''], $slotVals(fn ($c) => self::fmtNum($sum['totalMetersPerSlot'][$c['key']] ?? 0))));
        $out[] = $pad(array_merge(['Active looms', ''], $slotVals(fn ($c) => (string) ($sum['activeLoomsPerSlot'][$c['key']] ?? 0))));
        $out[] = $pad(array_merge(['Avg / loom', ''], $slotVals(function ($c) use ($sum) {
            $v = $sum['avgPerLoomPerSlot'][$c['key']] ?? null;

            return $v === null ? '' : self::fmtNum($v);
        })));

        return $out;
    }

    /**
     * Flat rows for plain CSV (single header row, no merges).
     *
     * @param  array  $bundle  from buildBundle()
     * @return array<int, array<int, string|int|float>>
     */
    public static function toSpreadsheetRows(array $bundle): array
    {
        $dates = $bundle['dates'];
        $cols = $bundle['dateShiftColumns'];
        if ($dates === []) {
            return [['Select a valid date range to build the report.']];
        }

        $header = ['Loom', 'Row'];
        foreach ($cols as $c) {
            $header[] = self::formatDayHeader($c['date']).' · '.$c['shift'];
        }

        return array_merge([$header], self::pivotBodyAndFooterRows($bundle));
    }

    /**
     * Rows + merge ranges (A1 notation) for .xlsx matching the on-screen matrix layout.
     *
     * @param  array  $bundle  from buildBundle()
     * @return array{rows: array<int, array<int, string|int|float>>, merges: string[]}
     */
    public static function excelMatrixSpec(array $bundle): array
    {
        $dates = $bundle['dates'];
        $cols = $bundle['dateShiftColumns'];
        if ($dates === []) {
            return ['rows' => [['Select a valid date range to build the report.']], 'merges' => []];
        }

        $n = count($dates);
        $width = 2 + 2 * $n;

        $r0 = array_fill(0, $width, '');
        $r0[0] = 'Loom';
        $r0[1] = 'Row';
        foreach ($dates as $i => $d) {
            $r0[2 + 2 * $i] = self::formatDayHeader($d).' ('.$d.')';
        }

        $r1 = array_fill(0, $width, '');
        foreach ($cols as $idx => $c) {
            $r1[2 + $idx] = $c['shift'];
        }

        $body = self::pivotBodyAndFooterRows($bundle);
        $rows = array_merge([$r0, $r1], $body);

        $merges = [];
        $merges[] = 'A1:A2';
        $merges[] = 'B1:B2';
        for ($i = 0; $i < $n; $i++) {
            $c1 = 3 + 2 * $i;
            $merges[] = self::xlCell($c1, 1).':'.self::xlCell($c1 + 1, 1);
        }
        $merges[] = 'A3:A4';

        $numLooms = count($bundle['loomBlocks']);
        for ($k = 0; $k < $numLooms; $k++) {
            $rStart = 5 + 4 * $k;
            $merges[] = 'A'.$rStart.':A'.($rStart + 3);
            $rTot = $rStart + 3;
            for ($i = 0; $i < $n; $i++) {
                $c1 = 3 + 2 * $i;
                $merges[] = self::xlCell($c1, $rTot).':'.self::xlCell($c1 + 1, $rTot);
            }
        }

        $footerExcelStart = 5 + 4 * $numLooms;
        for ($f = 0; $f < 3; $f++) {
            $r = $footerExcelStart + $f;
            $merges[] = 'A'.$r.':B'.$r;
        }

        return ['rows' => $rows, 'merges' => $merges];
    }

    private static function h(?string $s): string
    {
        return htmlspecialchars((string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    /**
     * HTML table for PDF (landscape); matches the on-screen production matrix layout.
     *
     * @param  array  $bundle  from buildBundle()
     * @param  string[]  $filterLines  human-readable filter summary lines
     */
    public static function toHtmlDocument(array $bundle, array $filterLines): string
    {
        $dates = $bundle['dates'];
        $cols = $bundle['dateShiftColumns'];
        if ($dates === []) {
            return '<html><body><p>'.self::h('Select a valid date range.').'</p></body></html>';
        }

        $filterHtml = implode(' &nbsp;|&nbsp; ', array_map(fn ($l) => self::h($l), $filterLines));

        $gw1 = $bundle['globalWeavers']['weaver1'];
        $gw2 = $bundle['globalWeavers']['weaver2'];
        $sum = $bundle['summaries'];

        $thDate = '';
        foreach ($dates as $d) {
            $thDate .= '<th colspan="2" style="border:1px solid #cbd5e1;padding:4px 6px;text-align:center;background:#e2e8f0;font-size:9px;">'
                .self::h(self::formatDayHeader($d).' ('.$d.')').'</th>';
        }

        $thShift = '';
        foreach ($cols as $c) {
            $border = $c['shift'] === 'Night' ? 'border-right:2px solid #94a3b8;' : '';
            $thShift .= '<th style="border:1px solid #cbd5e1;padding:3px 4px;text-align:center;background:#e2e8f0;font-size:8px;'.$border.'">'
                .self::h($c['shift']).'</th>';
        }

        $cells = function (callable $fn) use ($cols): string {
            $html = '';
            foreach ($cols as $c) {
                $border = $c['shift'] === 'Night' ? 'border-right:2px solid #94a3b8;' : '';
                $html .= '<td style="border:1px solid #e2e8f0;padding:3px 4px;font-size:8px;vertical-align:top;'.$border.'">'.$fn($c).'</td>';
            }

            return $html;
        };

        $tbody = '';

        $tbody .= '<tr style="background:#f5f3ff;">'
            .'<td rowspan="2" style="border:1px solid #cbd5e1;padding:4px;background:#ede9fe;font-size:8px;font-weight:bold;text-align:center;">Weavers</td>'
            .'<td style="border:1px solid #cbd5e1;padding:4px;background:#ede9fe;font-size:8px;">Weaver 1</td>'
            .$cells(fn ($c) => self::h($gw1[$c['key']] ?? '') ?: '—')
            .'</tr>';
        $tbody .= '<tr style="background:#f5f3ff;">'
            .'<td style="border:1px solid #cbd5e1;padding:4px;background:#ede9fe;font-size:8px;">Weaver 2</td>'
            .$cells(fn ($c) => self::h($gw2[$c['key']] ?? '') ?: '—')
            .'</tr>';

        foreach ($bundle['loomBlocks'] as $block) {
            $loom = $block['loomNumber'];
            $tbody .= '<tr>'
                .'<td rowspan="4" style="border:1px solid #cbd5e1;padding:4px;background:#f8fafc;font-weight:bold;font-size:9px;vertical-align:middle;">'.self::h($loom).'</td>'
                .'<td style="border:1px solid #cbd5e1;padding:3px 4px;font-size:8px;color:#475569;">Order ID</td>'
                .$cells(fn ($c) => self::h($block['orderId'][$c['key']] ?? '') ?: '—')
                .'</tr>';
            $tbody .= '<tr style="background:#f8fafc;">'
                .'<td style="border:1px solid #cbd5e1;padding:3px 4px;font-size:8px;color:#475569;">SL No</td>'
                .$cells(fn ($c) => self::h($block['slNo'][$c['key']] ?? '') ?: '—')
                .'</tr>';
            $tbody .= '<tr style="background:#f1f5f9;">'
                .'<td style="border:1px solid #cbd5e1;padding:3px 4px;font-size:8px;color:#475569;">Shift Mtr</td>'
                .$cells(fn ($c) => self::h(self::fmtNum($block['shiftMtr'][$c['key']] ?? null)) ?: '—')
                .'</tr>';
            $totalTds = '';
            foreach ($dates as $d) {
                $totalTds .= '<td colspan="2" style="border:1px solid #cbd5e1;border-right:2px solid #94a3b8;padding:3px 4px;text-align:right;font-size:8px;font-family:DejaVu Sans Mono,monospace;background:#f8fafc;">'
                    .self::h(self::fmtNum($block['dateTotal'][$d] ?? null) ?: '—')
                    .'</td>';
            }
            $tbody .= '<tr>'
                .'<td style="border:1px solid #cbd5e1;padding:3px 4px;font-size:8px;font-weight:600;">Total Mtr (day)</td>'
                .$totalTds
                .'</tr>';
        }

        $tfoot = '<tr style="background:#fffbeb;">'
            .'<td colspan="2" style="border:1px solid #fcd34d;padding:4px;font-size:8px;font-weight:bold;">Total shift m</td>'
            .$cells(fn ($c) => '<span style="font-family:DejaVu Sans Mono,monospace;">'.self::h(self::fmtNum($sum['totalMetersPerSlot'][$c['key']] ?? 0)).'</span>')
            .'</tr>';
        $tfoot .= '<tr style="background:#fffbeb;">'
            .'<td colspan="2" style="border:1px solid #fcd34d;padding:4px;font-size:8px;font-weight:bold;">Active looms</td>'
            .$cells(fn ($c) => self::h((string) ($sum['activeLoomsPerSlot'][$c['key']] ?? 0)))
            .'</tr>';
        $tfoot .= '<tr style="background:#fef3c7;">'
            .'<td colspan="2" style="border:1px solid #fcd34d;padding:4px;font-size:8px;font-weight:bold;">Avg / loom</td>'
            .$cells(function ($c) use ($sum) {
                $v = $sum['avgPerLoomPerSlot'][$c['key']] ?? null;

                return '<span style="font-family:DejaVu Sans Mono,monospace;">'.self::h($v === null ? '' : self::fmtNum($v)).'</span>';
            })
            .'</tr>';

        return '<html><head><meta charset="UTF-8"/><style>body{font-family:DejaVu Sans,Arial,sans-serif;font-size:9px;margin:12px;} table{border-collapse:collapse;width:100%;}</style></head><body>'
            .'<h2 style="margin:0 0 8px 0;font-size:14px;">Production matrix</h2>'
            .'<p style="margin:0 0 10px 0;color:#374151;font-size:9px;">'.$filterHtml.'</p>'
            .'<table>'
            .'<thead><tr>'
            .'<th rowspan="2" style="border:1px solid #cbd5e1;padding:4px;background:#e2e8f0;text-align:left;font-size:9px;">Loom</th>'
            .'<th rowspan="2" style="border:1px solid #cbd5e1;padding:4px;background:#e2e8f0;text-align:left;font-size:9px;">Row</th>'
            .$thDate
            .'</tr><tr>'.$thShift.'</tr></thead>'
            .'<tbody>'.$tbody.'</tbody>'
            .'<tfoot>'.$tfoot.'</tfoot>'
            .'</table>'
            .'<p style="margin-top:10px;font-size:7px;color:#64748b;">Weaver rows are global. Each loom: Order ID, SL No, Shift Mtr, Total Mtr (day).</p>'
            .'</body></html>';
    }
}
