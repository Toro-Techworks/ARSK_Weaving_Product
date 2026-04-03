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
        if (Schema::hasColumn('loom_entries', 'fabric_id')) {
            return;
        }

        Schema::table('loom_entries', function (Blueprint $table) {
            $table->foreignId('fabric_id')->nullable()->after('yarn_order_id')->constrained('fabrics')->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('loom_entries', 'fabric_id')) {
            return;
        }

        Schema::table('loom_entries', function (Blueprint $table) {
            $table->dropForeign(['fabric_id']);
            $table->dropColumn('fabric_id');
        });
    }
};
