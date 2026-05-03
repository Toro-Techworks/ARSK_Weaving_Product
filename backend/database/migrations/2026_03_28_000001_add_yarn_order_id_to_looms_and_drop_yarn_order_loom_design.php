<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('looms', function (Blueprint $table) {
            $table->foreignId('yarn_order_id')->nullable()->after('status')->constrained('yarn_orders')->nullOnDelete();
        });

        // One order per loom: keep the latest yarn_order id per loom_id.
        $pairs = DB::table('yarn_orders')
            ->selectRaw('loom_id, MAX(id) as yarn_order_id')
            ->whereNotNull('loom_id')
            ->groupBy('loom_id')
            ->get();

        foreach ($pairs as $row) {
            DB::table('looms')
                ->where('id', $row->loom_id)
                ->update(['yarn_order_id' => $row->yarn_order_id]);
        }

        Schema::table('yarn_orders', function (Blueprint $table) {
            $table->dropForeign(['loom_id']);
        });

        Schema::table('yarn_orders', function (Blueprint $table) {
            $table->dropColumn(['loom_id', 'design']);
        });
    }

    public function down(): void
    {
        Schema::table('yarn_orders', function (Blueprint $table) {
            $table->foreignId('loom_id')->nullable()->after('id')->constrained()->nullOnDelete();
            $table->text('design')->nullable()->after('weaving_unit');
        });

        $pairs = DB::table('looms')
            ->select(['id', 'yarn_order_id'])
            ->whereNotNull('yarn_order_id')
            ->get();

        foreach ($pairs as $row) {
            DB::table('yarn_orders')
                ->where('id', $row->yarn_order_id)
                ->update(['loom_id' => $row->id]);
        }

        Schema::table('looms', function (Blueprint $table) {
            $table->dropForeign(['yarn_order_id']);
            $table->dropColumn('yarn_order_id');
        });
    }
};
