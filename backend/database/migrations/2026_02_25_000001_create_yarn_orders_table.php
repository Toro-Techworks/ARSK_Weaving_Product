<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('yarn_orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_from', 255)->nullable();
            $table->string('weaving_unit', 255)->nullable();
            $table->string('po_number', 64)->nullable();
            $table->string('customer', 255)->nullable();
            $table->date('po_date')->nullable();
            $table->date('delivery_date')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('yarn_orders');
    }
};
