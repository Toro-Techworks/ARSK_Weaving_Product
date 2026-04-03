<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('fabrics')) {
            return;
        }
        if (Schema::hasColumn('fabrics', 'loom_id')) {
            return;
        }

        Schema::table('fabrics', function (Blueprint $table) {
            $table
                ->foreignId('loom_id')
                ->nullable()
                ->after('yarn_order_id')
                ->constrained('looms')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('fabrics')) {
            return;
        }
        if (! Schema::hasColumn('fabrics', 'loom_id')) {
            return;
        }

        Schema::table('fabrics', function (Blueprint $table) {
            $table->dropForeign(['loom_id']);
            $table->dropColumn('loom_id');
        });
    }
};
