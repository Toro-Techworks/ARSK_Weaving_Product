<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('loom_entries')) {
            return;
        }

        Schema::table('loom_entries', function (Blueprint $table) {
            if (! Schema::hasColumn('loom_entries', 'customer')) {
                $table->string('customer', 255)->nullable()->after('colour');
            }
            if (! Schema::hasColumn('loom_entries', 'snapshot_order_label')) {
                $table->string('snapshot_order_label', 64)->nullable()->after('customer');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('loom_entries')) {
            return;
        }

        Schema::table('loom_entries', function (Blueprint $table) {
            if (Schema::hasColumn('loom_entries', 'snapshot_order_label')) {
                $table->dropColumn('snapshot_order_label');
            }
            if (Schema::hasColumn('loom_entries', 'customer')) {
                $table->dropColumn('customer');
            }
        });
    }
};
