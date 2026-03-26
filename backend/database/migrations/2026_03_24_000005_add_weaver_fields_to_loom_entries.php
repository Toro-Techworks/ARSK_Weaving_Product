<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loom_entries', function (Blueprint $table) {
            $table->foreignId('weaver1_id')->nullable()->after('operator_name')->constrained('weavers')->nullOnDelete();
            $table->foreignId('weaver2_id')->nullable()->after('weaver1_id')->constrained('weavers')->nullOnDelete();
            $table->text('remarks')->nullable()->after('weaver2_id');
        });
    }

    public function down(): void
    {
        Schema::table('loom_entries', function (Blueprint $table) {
            $table->dropForeign(['weaver1_id']);
            $table->dropForeign(['weaver2_id']);
            $table->dropColumn(['weaver1_id', 'weaver2_id', 'remarks']);
        });
    }
};
