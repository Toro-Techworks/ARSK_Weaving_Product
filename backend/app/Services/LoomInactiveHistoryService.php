<?php

namespace App\Services;

use App\Models\Loom;
use App\Models\LoomInactiveHistory;
use Carbon\CarbonImmutable;

class LoomInactiveHistoryService
{
    public static function normalizeStatus(mixed $status): string
    {
        if (! is_string($status)) {
            return '';
        }
        $s = trim($status);

        return strcasecmp($s, 'inactive') === 0 ? 'Inactive' : 'Active';
    }

    public static function isInactive(mixed $status): bool
    {
        return self::normalizeStatus($status) === 'Inactive';
    }

    /**
     * Ensure an open inactive period exists for an inactive loom and sync reason/remarks.
     * Covers looms marked inactive before history tracking or reason-only updates.
     */
    public function ensureOpenPeriod(
        Loom $loom,
        ?int $changedByUserId,
        ?string $inactiveReason = null,
        ?string $remarks = null,
    ): void {
        if (! self::isInactive($loom->status)) {
            return;
        }

        $reason = trim((string) ($inactiveReason ?? $loom->inactive_reason ?? ''));
        $reason = $reason !== '' ? $reason : null;
        $remarksText = $remarks !== null ? trim($remarks) : null;
        $remarksText = $remarksText !== '' ? $remarksText : null;

        $open = LoomInactiveHistory::query()
            ->where('loom_id', $loom->id)
            ->whereNull('inactive_end_date')
            ->whereNotNull('inactive_start_date')
            ->orderByDesc('inactive_start_date')
            ->orderByDesc('id')
            ->first();

        if ($open) {
            $updates = [];
            if ($reason !== null) {
                $updates['inactive_reason'] = $reason;
            }
            if ($remarksText !== null) {
                $updates['remarks'] = $remarksText;
            }
            if ($changedByUserId !== null) {
                $updates['changed_by_user_id'] = $changedByUserId;
            }
            if ($updates !== []) {
                $open->update($updates);
            }

            return;
        }

        if ($reason === null) {
            return;
        }

        LoomInactiveHistory::create([
            'loom_id' => $loom->id,
            'previous_status' => 'Active',
            'new_status' => 'Inactive',
            'inactive_reason' => $reason,
            'remarks' => $remarksText,
            'inactive_start_date' => CarbonImmutable::now(),
            'inactive_end_date' => null,
            'changed_by_user_id' => $changedByUserId,
        ]);
    }

    /**
     * Record audit row and open/close inactive periods when status changes.
     */
    public function recordStatusChange(
        Loom $loom,
        string $previousStatus,
        string $newStatus,
        ?int $changedByUserId,
        ?string $inactiveReason = null,
        ?string $remarks = null,
    ): void {
        $prev = self::normalizeStatus($previousStatus);
        $next = self::normalizeStatus($newStatus);
        if ($prev === $next) {
            return;
        }

        $now = CarbonImmutable::now();

        if ($next === 'Inactive') {
            LoomInactiveHistory::create([
                'loom_id' => $loom->id,
                'previous_status' => $prev,
                'new_status' => $next,
                'inactive_reason' => $inactiveReason,
                'remarks' => $remarks,
                'inactive_start_date' => $now,
                'inactive_end_date' => null,
                'changed_by_user_id' => $changedByUserId,
            ]);

            return;
        }

        if ($prev === 'Inactive' && $next === 'Active') {
            $open = LoomInactiveHistory::query()
                ->where('loom_id', $loom->id)
                ->whereNull('inactive_end_date')
                ->orderByDesc('inactive_start_date')
                ->orderByDesc('id')
                ->first();

            if ($open) {
                $open->update([
                    'inactive_end_date' => $now,
                    'changed_by_user_id' => $changedByUserId ?? $open->changed_by_user_id,
                ]);
            }

            LoomInactiveHistory::create([
                'loom_id' => $loom->id,
                'previous_status' => $prev,
                'new_status' => $next,
                'inactive_reason' => null,
                'remarks' => $remarks,
                'inactive_start_date' => null,
                'inactive_end_date' => $now,
                'changed_by_user_id' => $changedByUserId,
            ]);
        }
    }

    /**
     * @return array<string, mixed>|null
     */
    public function currentOpenPeriodForLoom(int $loomId): ?array
    {
        $row = LoomInactiveHistory::query()
            ->where('loom_id', $loomId)
            ->whereNull('inactive_end_date')
            ->whereNotNull('inactive_start_date')
            ->orderByDesc('inactive_start_date')
            ->orderByDesc('id')
            ->first();

        if (! $row) {
            return null;
        }

        return $this->formatPeriodRow($row);
    }

    /**
     * @param  list<int>  $loomIds
     * @return array<string, array<string, mixed>>
     */
    public function currentOpenPeriodsForLooms(array $loomIds): array
    {
        if ($loomIds === []) {
            return [];
        }

        $rows = LoomInactiveHistory::query()
            ->whereIn('loom_id', $loomIds)
            ->whereNull('inactive_end_date')
            ->whereNotNull('inactive_start_date')
            ->orderBy('loom_id')
            ->orderByDesc('inactive_start_date')
            ->orderByDesc('id')
            ->get();

        $out = [];
        foreach ($rows as $row) {
            $key = (string) $row->loom_id;
            if (isset($out[$key])) {
                continue;
            }
            $out[$key] = $this->formatPeriodRow($row);
        }

        return $out;
    }

    /**
     * @return array{total_inactive_days: float, periods: list<array<string, mixed>>}
     */
    public function timelineForLoom(int $loomId, int $limit = 50): array
    {
        $periods = LoomInactiveHistory::query()
            ->where('loom_id', $loomId)
            ->whereNotNull('inactive_start_date')
            ->with(['changedBy:id,name,username'])
            ->orderByDesc('inactive_start_date')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();

        $totalDays = 0.0;
        $formatted = [];
        foreach ($periods as $row) {
            $item = $this->formatPeriodRow($row);
            $formatted[] = $item;
            $totalDays += (float) ($item['downtime_days'] ?? 0);
        }

        return [
            'total_inactive_days' => round($totalDays, 2),
            'periods' => $formatted,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function formatPeriodRow(LoomInactiveHistory $row): array
    {
        $start = $row->inactive_start_date;
        $end = $row->inactive_end_date;
        $downtimeDays = null;
        if ($start) {
            $endPoint = $end ?? now();
            $downtimeDays = round($start->diffInMinutes($endPoint) / (60 * 24), 2);
        }

        return [
            'id' => $row->id,
            'loom_id' => $row->loom_id,
            'previous_status' => $row->previous_status,
            'new_status' => $row->new_status,
            'inactive_reason' => $row->inactive_reason,
            'remarks' => $row->remarks,
            'inactive_start_date' => $start?->toIso8601String(),
            'inactive_end_date' => $end?->toIso8601String(),
            'inactive_since' => $start?->format('Y-m-d'),
            'inactive_since_display' => $start?->format('d M Y'),
            'inactive_until_display' => $end?->format('d M Y'),
            'downtime_days' => $downtimeDays,
            'changed_by_user_id' => $row->changed_by_user_id,
            'changed_by_name' => $row->changedBy?->name ?? $row->changedBy?->username,
            'created_at' => $row->created_at?->toIso8601String(),
        ];
    }

    public static function downtimeLabel(?float $days): string
    {
        if ($days === null) {
            return '—';
        }
        if ($days < 1) {
            return '< 1 day';
        }

        return rtrim(rtrim(number_format($days, 2, '.', ''), '0'), '.').' days';
    }
}
