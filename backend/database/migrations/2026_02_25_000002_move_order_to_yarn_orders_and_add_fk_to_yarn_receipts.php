<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('yarn_receipts', function (Blueprint $table) {
            $table->foreignId('yarn_order_id')->nullable()->after('id')->constrained('yarn_orders')->nullOnDelete();
        });

        Schema::table('yarn_receipts', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropForeign(['loom_id']);
        });
        Schema::table('yarn_receipts', function (Blueprint $table) {
            $table->dropColumn([
                'company_id',
                'loom_id',
                'po_number',
                'customer',
                'po_date',
                'delivery_date',
                'order_from',
                'weaving_unit',
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('yarn_receipts', function (Blueprint $table) {
            $table->foreignId('company_id')->nullable()->after('id')->constrained()->nullOnDelete();
            $table->foreignId('loom_id')->nullable()->after('company_id')->constrained()->nullOnDelete();
            $table->string('po_number', 64)->nullable()->after('loom_id');
            $table->string('customer', 255)->nullable()->after('po_number');
            $table->date('po_date')->nullable()->after('customer');
            $table->date('delivery_date')->nullable()->after('po_date');
            $table->string('order_from', 255)->nullable()->after('delivery_date');
            $table->string('weaving_unit', 255)->nullable()->after('order_from');
        });
        Schema::table('yarn_receipts', function (Blueprint $table) {
            $table->dropForeign(['yarn_order_id']);
        });
    }
};
