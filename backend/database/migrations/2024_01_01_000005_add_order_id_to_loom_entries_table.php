<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loom_entries', function (Blueprint $table) {
            $table->foreignId('order_id')->nullable()->after('loom_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('loom_entries', function (Blueprint $table) {
            $table->dropForeign(['order_id']);
        });
    }
};
