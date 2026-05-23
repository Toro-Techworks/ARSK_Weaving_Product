<?php

namespace App\Services;

use App\Models\Fabric;
use App\Models\Loom;
use App\Models\LoomAssignmentHistory;
use App\Models\LoomEntry;
use App\Models\YarnOrder;
use App\Services\LoomOrderAssignmentService as LoomOrderAssignmentHelper;
use Carbon\CarbonImmutable;

/**
 * Resolves per-loom, per-date design / weave_tech / colour for the Daily Entry grid.
 *
 * Primary source: loom_order_assignments (date ranges per loom/order).
 * Fallback: loom_assignment_history snapshots, then current fabric.loom_id.
 *
 * Persisted loom_entries values take precedence for dates that already have saved
 * production rows, so historical production data is never overwritten by reassignment.
 */
class DailyEntryLoomConfigurationService
{
    public function __construct(
        private readonly LoomOrderAssignmentService $loomOrderAssignmentService,
    ) {}
    /**
     * Assignment design / weave / colour for a loom on a calendar date (from order ranges or history).
     *
     * @return array{design: ?string, weave_technique: ?string, colour: ?string}
     */
    public function resolveAssignmentForLoomDate(int $loomId, string $date): array
    {
        $endOfDay = CarbonImmutable::parse($date)->endOfDay();
        $assignments = $this->resolveAssignments([$loomId], [$date], $endOfDay);
        $assigned = $assignments[$loomId][$date] ?? [];

        return [
            'design' => $assigned['design'] ?? null,
            'weave_technique' => $assigned['weave_technique'] ?? null,
            'colour' => $assigned['colour'] ?? null,
            'yarn_order_id' => isset($assigned['yarn_order_id']) ? (int) $assigned['yarn_order_id'] : null,
            'order_id' => $assigned['order_id'] ?? null,
            'customer' => $assigned['customer'] ?? null,
        ];
    }

    /**
     * Lock design / weave / colour on a loom entry row from the current assignment (first save only).
     *
     * @param  array<string, mixed>  $row
     */
    public function applyAssignmentSnapshotToRow(array &$row, int $loomId, string $date, bool $whenPersisting): void
    {
        if (! $whenPersisting) {
            return;
        }

        $snap = $this->resolveAssignmentForLoomDate($loomId, $date);

        if (! $this->rowHasConfigSnapshot($row)) {
            foreach (['design', 'weave_technique', 'colour'] as $field) {
                if (empty($row[$field]) && ! empty($snap[$field])) {
                    $row[$field] = $snap[$field];
                }
            }
        }

        if (empty($row['yarn_order_id']) && ! empty($snap['yarn_order_id'])) {
            $row['yarn_order_id'] = (int) $snap['yarn_order_id'];
        }
        if (empty($row['snapshot_order_label']) && ! empty($snap['order_id'])) {
            $row['snapshot_order_label'] = $snap['order_id'];
        }
        if (empty($row['customer']) && ! empty($snap['customer'])) {
            $row['customer'] = $snap['customer'];
        }
    }

    /**
     * @param  array<string, mixed>  $row
     */
    public function rowHasConfigSnapshot(array $row): bool
    {
        return ! empty($row['design'])
            || ! empty($row['weave_technique'])
            || ! empty($row['colour']);
    }

    /**
     * @return array<string, array<string, array{design: ?string, weave_tech: ?string, colour: ?string}>>
     *                                                                 Keys per column: "YYYY-MM-DD|Day" / "YYYY-MM-DD|Night"
     */
    public function resolveForDateRange(string $start, string $end, ?array $loomIds = null): array
    {
        $from = CarbonImmutable::parse($start)->startOfDay();
        $to = CarbonImmutable::parse($end)->endOfDay();
        if ($to->lessThan($from)) {
            return [];
        }

        $loomsQuery = Loom::query()->orderBy('loom_number');
        if ($loomIds !== null && $loomIds !== []) {
            $loomsQuery->whereIn('id', $loomIds);
        }
        $looms = $loomsQuery->get(['id', 'loom_number']);
        if ($looms->isEmpty()) {
            return [];
        }

        $loomIdsResolved = $looms->pluck('id')->map(fn ($x) => (int) $x)->all();
        $loomNumberById = $looms->keyBy('id')->map(fn ($l) => (string) $l->loom_number)->all();

        $dates = [];
        $cur = $from;
        while ($cur->lessThanOrEqualTo($to)) {
            $dates[] = $cur->format('Y-m-d');
            $cur = $cur->addDay();
        }

        $assignmentByLoomId = $this->resolveAssignments($loomIdsResolved, $dates, $to);
        $persistedByLoomSlot = $this->resolvePersistedFromEntries($loomIdsResolved, $dates);

        $result = [];
        foreach ($loomIdsResolved as $lid) {
            $loomKey = $loomNumberById[$lid] ?? (string) $lid;
            $perSlot = [];
            foreach ($dates as $d) {
                $assigned = $assignmentByLoomId[$lid][$d] ?? null;
                $assignmentConfig = [
                    'design' => $assigned['design'] ?? null,
                    'weave_tech' => $assigned['weave_technique'] ?? null,
                    'colour' => $assigned['colour'] ?? null,
                    'order_id' => $assigned['order_id'] ?? null,
                    'customer' => $assigned['customer'] ?? null,
                ];
                foreach (['Day', 'Night'] as $shift) {
                    $slotKey = $d.'|'.$shift;
                    $persisted = $persistedByLoomSlot[$lid][$slotKey] ?? null;
                    $perSlot[$slotKey] = $persisted ?? $assignmentConfig;
                }
            }
            $result[$loomKey] = $perSlot;
        }

        return $result;
    }

    /**
     * @param  list<int>  $loomIds
     * @param  list<string>  $dates
     * @return array<int, array<string, array<string, mixed>>>
     */
    private function resolveAssignments(array $loomIds, array $dates, CarbonImmutable $windowEnd): array
    {
        $fromRanges = $this->loomOrderAssignmentService->resolveForLoomsAndDates($loomIds, $dates);
        $fromHistory = $this->resolveAssignmentsFromHistory($loomIds, $dates, $windowEnd);

        $merged = [];
        foreach ($loomIds as $lid) {
            foreach ($dates as $d) {
                $range = $fromRanges[$lid][$d] ?? null;
                $hasRange = $range && (
                    ($range['design'] ?? null) !== null
                    || ($range['weave_technique'] ?? null) !== null
                    || ($range['colour'] ?? null) !== null
                    || ($range['order_id'] ?? null) !== null
                    || ($range['customer'] ?? null) !== null
                );
                $merged[$lid][$d] = $hasRange ? $range : ($fromHistory[$lid][$d] ?? [
                    'design' => null,
                    'weave_technique' => null,
                    'colour' => null,
                    'yarn_order_id' => null,
                    'order_id' => null,
                    'customer' => null,
                ]);
            }
        }

        return $merged;
    }

    /**
     * @param  list<int>  $loomIds
     * @param  list<string>  $dates
     * @return array<int, array<string, array<string, mixed>>>
     */
    private function resolveAssignmentsFromHistory(array $loomIds, array $dates, CarbonImmutable $windowEnd): array
    {
        $history = LoomAssignmentHistory::query()
            ->whereIn('loom_id', $loomIds)
            ->where('assigned_at', '<=', $windowEnd)
            ->orderBy('loom_id')
            ->orderBy('assigned_at')
            ->orderBy('id')
            ->get([
                'loom_id',
                'fabric_id',
                'yarn_order_id',
                'design',
                'weave_technique',
                'colour',
                'assigned_at',
            ]);

        $historyOrderIds = collect($history)->pluck('yarn_order_id')->filter()->unique()->map(fn ($x) => (int) $x)->all();
        $historyOrders = $historyOrderIds !== []
            ? YarnOrder::query()->whereIn('id', $historyOrderIds)->get(['id', 'customer', 'display_order_id', 'po_date', 'created_at'])->keyBy('id')
            : collect();

        $byLoom = [];
        foreach ($history as $h) {
            $byLoom[(int) $h->loom_id][] = $h;
        }

        $loomsWithoutHistory = array_values(array_diff($loomIds, array_keys($byLoom)));
        $currentFallback = [];
        if ($loomsWithoutHistory !== []) {
            $currentFallback = Fabric::query()
                ->whereIn('loom_id', $loomsWithoutHistory)
                ->get(['id', 'loom_id', 'yarn_order_id', 'design', 'weave_technique', 'colour'])
                ->keyBy(fn ($f) => (int) $f->loom_id)
                ->all();
            $fabricOrderIds = collect($currentFallback)
                ->pluck('yarn_order_id')
                ->filter()
                ->map(fn ($x) => (int) $x)
                ->unique()
                ->values()
                ->all();
            $missingOrderIds = array_diff($fabricOrderIds, $historyOrderIds);
            if ($missingOrderIds !== []) {
                $extraOrders = YarnOrder::query()
                    ->whereIn('id', $missingOrderIds)
                    ->get(['id', 'customer', 'display_order_id', 'po_date', 'created_at'])
                    ->keyBy('id');
                $historyOrders = $historyOrders->merge($extraOrders);
            }
        }

        $result = [];
        foreach ($loomIds as $lid) {
            $rows = $byLoom[$lid] ?? [];
            foreach ($dates as $d) {
                $endOfDay = CarbonImmutable::parse($d)->endOfDay();
                $match = null;
                for ($i = count($rows) - 1; $i >= 0; $i--) {
                    $r = $rows[$i];
                    if ($r->assigned_at && $r->assigned_at->lessThanOrEqualTo($endOfDay)) {
                        $match = $r;
                        break;
                    }
                }
                if ($match) {
                    $order = $match->yarn_order_id ? $historyOrders->get((int) $match->yarn_order_id) : null;
                    $result[$lid][$d] = [
                        'design' => $match->design,
                        'weave_technique' => $match->weave_technique,
                        'colour' => $match->colour,
                        'yarn_order_id' => $match->yarn_order_id ? (int) $match->yarn_order_id : null,
                        'order_id' => LoomOrderAssignmentHelper::orderDisplayLabel(
                            $match->yarn_order_id ? (int) $match->yarn_order_id : null,
                            $order,
                            $d
                        ),
                        'customer' => LoomOrderAssignmentHelper::customerLabel($order),
                    ];
                } elseif (isset($currentFallback[$lid])) {
                    $f = $currentFallback[$lid];
                    $order = $f->yarn_order_id ? $historyOrders->get((int) $f->yarn_order_id) : null;
                    $result[$lid][$d] = [
                        'design' => $f->design,
                        'weave_technique' => $f->weave_technique,
                        'colour' => $f->colour,
                        'yarn_order_id' => $f->yarn_order_id ? (int) $f->yarn_order_id : null,
                        'order_id' => LoomOrderAssignmentHelper::orderDisplayLabel(
                            $f->yarn_order_id ? (int) $f->yarn_order_id : null,
                            $order,
                            $d
                        ),
                        'customer' => LoomOrderAssignmentHelper::customerLabel($order),
                    ];
                } else {
                    $result[$lid][$d] = [
                        'design' => null,
                        'weave_technique' => null,
                        'colour' => null,
                        'yarn_order_id' => null,
                        'order_id' => null,
                        'customer' => null,
                    ];
                }
            }
        }

        return $result;
    }

    /**
     * Saved production rows: design/weave/colour locked per loom + date + shift.
     *
     * @param  list<int>  $loomIds
     * @param  list<string>  $dates
     * @return array<int, array<string, array{design: ?string, weave_tech: ?string, colour: ?string}>>
     */
    private function resolvePersistedFromEntries(array $loomIds, array $dates): array
    {
        if ($loomIds === [] || $dates === []) {
            return [];
        }

        $entries = LoomEntry::query()
            ->whereIn('loom_id', $loomIds)
            ->whereBetween('date', [$dates[0], $dates[count($dates) - 1]])
            ->where(function ($q) {
                $q->where(function ($q2) {
                    $q2->whereNotNull('design')
                        ->orWhereNotNull('weave_technique')
                        ->orWhereNotNull('colour')
                        ->orWhereNotNull('yarn_order_id')
                        ->orWhereNotNull('customer')
                        ->orWhereNotNull('snapshot_order_label');
                })->orWhere('meters_produced', '>', 0);
            })
            ->orderBy('loom_id')
            ->orderBy('date')
            ->orderBy('id')
            ->get([
                'loom_id',
                'date',
                'shift',
                'design',
                'weave_technique',
                'colour',
                'meters_produced',
                'yarn_order_id',
                'customer',
                'snapshot_order_label',
            ]);

        $orderIds = $entries->pluck('yarn_order_id')->filter()->unique()->map(fn ($x) => (int) $x)->all();
        $ordersById = $orderIds !== []
            ? YarnOrder::query()->whereIn('id', $orderIds)->get(['id', 'customer', 'display_order_id', 'po_date', 'created_at'])->keyBy('id')
            : collect();

        $result = [];
        foreach ($entries as $e) {
            $lid = (int) $e->loom_id;
            $d = $e->date instanceof \Carbon\CarbonInterface
                ? $e->date->format('Y-m-d')
                : (string) $e->date;
            if (! in_array($d, $dates, true)) {
                continue;
            }
            $shiftKey = $this->normalizeShiftSlotKey($e->shift);
            if ($shiftKey === null) {
                continue;
            }
            $slotKey = $d.'|'.$shiftKey;
            if (isset($result[$lid][$slotKey])) {
                continue;
            }
            $design = $e->design !== null && trim((string) $e->design) !== '' ? (string) $e->design : null;
            $weave = $e->weave_technique !== null && trim((string) $e->weave_technique) !== '' ? (string) $e->weave_technique : null;
            $colour = $e->colour !== null && trim((string) $e->colour) !== '' ? (string) $e->colour : null;
            $snapOrder = $e->snapshot_order_label !== null && trim((string) $e->snapshot_order_label) !== ''
                ? trim((string) $e->snapshot_order_label)
                : null;
            $snapCustomer = $e->customer !== null && trim((string) $e->customer) !== ''
                ? trim((string) $e->customer)
                : null;

            if ($design === null && $weave === null && $colour === null && (float) $e->meters_produced <= 0
                && ! $e->yarn_order_id && $snapOrder === null && $snapCustomer === null) {
                continue;
            }
            $order = $e->yarn_order_id ? $ordersById->get((int) $e->yarn_order_id) : null;
            $result[$lid][$slotKey] = [
                'design' => $design,
                'weave_tech' => $weave,
                'colour' => $colour,
                'order_id' => $snapOrder ?? LoomOrderAssignmentHelper::orderDisplayLabel(
                    $e->yarn_order_id ? (int) $e->yarn_order_id : null,
                    $order,
                    $d
                ),
                'customer' => $snapCustomer ?? LoomOrderAssignmentHelper::customerLabel($order),
            ];
        }

        return $result;
    }

    private function normalizeShiftSlotKey(mixed $shift): ?string
    {
        $t = trim((string) $shift);
        if ($t === '') {
            return null;
        }
        if (strcasecmp($t, 'day') === 0) {
            return 'Day';
        }
        if (strcasecmp($t, 'night') === 0) {
            return 'Night';
        }

        return null;
    }
}
