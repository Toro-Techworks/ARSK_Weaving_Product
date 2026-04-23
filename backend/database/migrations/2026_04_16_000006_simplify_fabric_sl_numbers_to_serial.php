<?php

use App\Models\YarnOrder;
use App\Support\SlNumberFormatter;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Simplify fabrics.sl_number to a plain per-order serial ("1", "2", "3", …).
 *
 * The previous format was "{COMPANY4}_{ORDER7}_{001}" and had a GLOBAL unique index.
 * With the new serial-per-order scheme the same value (e.g. "1") appears across
 * different orders, so the global unique constraint is dropped here.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('fabrics') || ! Schema::hasColumn('fabrics', 'sl_number')) {
            return;
        }

        // Drop the global unique index on sl_number (safe even if it was never created).
        try {
            Schema::table('fabrics', function (Blueprint $table) {
                $table->dropUnique(['sl_number']);
            });
        } catch (\Throwable $e) {
            // Index may have a different name or not exist — fine, continue.
        }

        // Recompute sl_number for every yarn order using the new formatter output.
        YarnOrder::query()->orderBy('id')->chunk(100, function ($orders) {
            foreach ($orders as $order) {
                SlNumberFormatter::refreshSlNumbersForYarnOrder((int) $order->id);
            }
        });

        // Orphan fabrics whose yarn_order_id no longer points to an order are
        // handled defensively by scanning distinct yarn_order_ids directly.
        $orphanOrderIds = DB::table('fabrics')
            ->whereNotNull('yarn_order_id')
            ->whereNotExists(function ($q) {
                $q->select(DB::raw(1))
                    ->from('yarn_orders')
                    ->whereColumn('yarn_orders.id', 'fabrics.yarn_order_id');
            })
            ->distinct()
            ->pluck('yarn_order_id');

        foreach ($orphanOrderIds as $oid) {
            SlNumberFormatter::refreshSlNumbersForYarnOrder((int) $oid);
        }
    }

    public function down(): void
    {
        // Re-adding a global unique constraint is not safe (duplicates exist across orders),
        // and the previous composite SL format is produced by legacy code paths that no
        // longer exist. Intentionally a no-op.
    }
};
