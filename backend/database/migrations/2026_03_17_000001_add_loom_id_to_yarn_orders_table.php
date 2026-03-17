<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('yarn_orders', function (Blueprint $table) {
            $table->foreignId('loom_id')->nullable()->after('id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('yarn_orders', function (Blueprint $table) {
            $table->dropForeign(['loom_id']);
            $table->dropColumn('loom_id');
        });
    }
};

