<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('order_from', 255)->nullable()->after('loom_id');
            $table->string('customer', 255)->nullable()->after('order_from');
            $table->string('weaving_unit', 255)->nullable()->after('customer');
            $table->string('po_number', 64)->nullable()->after('weaving_unit');
            $table->date('po_date')->nullable()->after('po_number');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['order_from', 'customer', 'weaving_unit', 'po_number', 'po_date']);
        });
    }
};
