<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loom_entries', function (Blueprint $table) {
            $table->foreignId('yarn_order_id')->nullable()->after('loom_id')->constrained('yarn_orders')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('loom_entries', function (Blueprint $table) {
            $table->dropForeign(['yarn_order_id']);
            $table->dropColumn('yarn_order_id');
        });
    }
};

