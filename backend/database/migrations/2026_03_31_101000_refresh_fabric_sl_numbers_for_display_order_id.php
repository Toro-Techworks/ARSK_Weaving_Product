<?php

use App\Models\YarnOrder;
use App\Support\SlNumberFormatter;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Recompute persisted {@see Fabric::$sl_number} so the middle segment matches {@see YarnOrder::$display_order_id}.
     */
    public function up(): void
    {
        if (! SlNumberFormatter::fabricsTableHasSlNumberColumn()) {
            return;
        }

        YarnOrder::query()->orderBy('id')->chunk(100, function ($orders) {
            foreach ($orders as $order) {
                SlNumberFormatter::refreshSlNumbersForYarnOrder((int) $order->id);
            }
        });
    }

    public function down(): void
    {
        // irreversible data sync
    }
};
