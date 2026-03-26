<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Legacy: older installs created `fabrics` with order_id → orders.
     * Fresh installs use yarn_order_id from 2026_02_26_000001 — this migration no-ops.
     */
    public function up(): void
    {
        if (! Schema::hasTable('fabrics')) {
            return;
        }
        if (Schema::hasColumn('fabrics', 'yarn_order_id')) {
            return;
        }
        if (! Schema::hasColumn('fabrics', 'order_id')) {
            return;
        }

        Schema::table('fabrics', function (Blueprint $table) {
            $table->dropForeign(['order_id']);
            $table->dropColumn('order_id');
        });
        Schema::table('fabrics', function (Blueprint $table) {
            $table->foreignId('yarn_order_id')->after('id')->constrained('yarn_orders')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('fabrics')) {
            return;
        }
        if (! Schema::hasColumn('fabrics', 'yarn_order_id') || Schema::hasColumn('fabrics', 'order_id')) {
            return;
        }
        if (! Schema::hasTable('orders')) {
            // Cannot restore order_id FK after orders table was dropped
            return;
        }

        Schema::table('fabrics', function (Blueprint $table) {
            $table->dropForeign(['yarn_order_id']);
            $table->dropColumn('yarn_order_id');
        });
        Schema::table('fabrics', function (Blueprint $table) {
            $table->foreignId('order_id')->after('id')->constrained('orders')->cascadeOnDelete();
        });
    }
};
