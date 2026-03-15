<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
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
        Schema::table('fabrics', function (Blueprint $table) {
            $table->dropForeign(['yarn_order_id']);
            $table->dropColumn('yarn_order_id');
        });
        Schema::table('fabrics', function (Blueprint $table) {
            $table->foreignId('order_id')->after('id')->constrained('orders')->cascadeOnDelete();
        });
    }
};
