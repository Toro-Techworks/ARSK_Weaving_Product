<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $this->addIndexIfMissing('loom_entries', ['date', 'loom_id', 'yarn_order_id', 'shift'], 'idx_loom_entries_reports');
        $this->addIndexIfMissing('yarn_receipts', ['date', 'type', 'count', 'content'], 'idx_yarn_receipts_reports');
        $this->addIndexIfMissing('yarn_requirements', ['yarn_order_id', 'count', 'content'], 'idx_yarn_requirements_reports');
    }

    public function down(): void
    {
        Schema::table('loom_entries', function (Blueprint $table) {
            $table->dropIndex('idx_loom_entries_reports');
        });
        Schema::table('yarn_receipts', function (Blueprint $table) {
            $table->dropIndex('idx_yarn_receipts_reports');
        });
        Schema::table('yarn_requirements', function (Blueprint $table) {
            $table->dropIndex('idx_yarn_requirements_reports');
        });
    }

    private function addIndexIfMissing(string $table, array $columns, string $indexName): void
    {
        $exists = DB::selectOne(
            "SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?",
            [$table, $indexName]
        );
        if (!$exists) {
            Schema::table($table, function (Blueprint $t) use ($columns, $indexName) {
                $t->index($columns, $indexName);
            });
        }
    }
};

