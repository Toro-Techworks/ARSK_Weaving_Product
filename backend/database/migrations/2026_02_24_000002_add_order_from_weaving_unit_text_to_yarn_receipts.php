<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('yarn_receipts', function (Blueprint $table) {
            $table->string('order_from', 255)->nullable()->after('delivery_date');
            $table->string('weaving_unit', 255)->nullable()->after('order_from');
        });
    }

    public function down(): void
    {
        Schema::table('yarn_receipts', function (Blueprint $table) {
            $table->dropColumn(['order_from', 'weaving_unit']);
        });
    }
};
