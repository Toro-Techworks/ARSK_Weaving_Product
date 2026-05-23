<?php

use App\Models\Loom;
use App\Models\LoomInactiveHistory;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        Loom::query()
            ->whereRaw('LOWER(TRIM(status)) = ?', ['inactive'])
            ->orderBy('id')
            ->each(function (Loom $loom) use ($now) {
                $reason = trim((string) ($loom->inactive_reason ?? ''));
                if ($reason === '') {
                    return;
                }

                $open = LoomInactiveHistory::query()
                    ->where('loom_id', $loom->id)
                    ->whereNull('inactive_end_date')
                    ->whereNotNull('inactive_start_date')
                    ->orderByDesc('inactive_start_date')
                    ->orderByDesc('id')
                    ->first();

                if ($open) {
                    if ($open->inactive_reason === null || $open->inactive_reason === '') {
                        $open->update(['inactive_reason' => $reason, 'updated_at' => $now]);
                    }

                    return;
                }

                LoomInactiveHistory::create([
                    'loom_id' => $loom->id,
                    'previous_status' => 'Active',
                    'new_status' => 'Inactive',
                    'inactive_reason' => $reason,
                    'remarks' => null,
                    'inactive_start_date' => $loom->updated_at ?? $now,
                    'inactive_end_date' => null,
                    'changed_by_user_id' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            });
    }

    public function down(): void
    {
        // Non-destructive backfill; no down.
    }
};
