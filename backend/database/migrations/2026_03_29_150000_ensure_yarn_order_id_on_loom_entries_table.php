<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Some databases were created before loom_entries.yarn_order_id existed, or the
     * migration was skipped; the production report and API expect this column.
     */
    public function up(): void
    {
        if (Schema::hasColumn('loom_entries', 'yarn_order_id')) {
            return;
        }

        Schema::table('loom_entries', function (Blueprint $table) {
            $table->foreignId('yarn_order_id')->nullable()->after('loom_id')->constrained('yarn_orders')->nullOnDelete();
        });

        if (Schema::hasColumn('looms', 'yarn_order_id')) {
            DB::statement(
                'UPDATE loom_entries AS le INNER JOIN looms AS l ON l.id = le.loom_id SET le.yarn_order_id = l.yarn_order_id WHERE l.yarn_order_id IS NOT NULL'
            );
        }
    }

    public function down(): void
    {
        if (! Schema::hasColumn('loom_entries', 'yarn_order_id')) {
            return;
        }

        Schema::table('loom_entries', function (Blueprint $table) {
            $table->dropForeign(['yarn_order_id']);
            $table->dropColumn('yarn_order_id');
        });
    }
};
