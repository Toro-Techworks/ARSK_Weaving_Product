<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('dc_number')->unique();
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->string('fabric_type');
            $table->decimal('quantity_meters', 12, 2);
            $table->decimal('rate_per_meter', 12, 2);
            $table->foreignId('loom_id')->constrained()->onDelete('restrict');
            $table->date('delivery_date');
            $table->enum('status', ['Pending', 'Running', 'Completed'])->default('Pending');
            $table->decimal('total_amount', 14, 2)->default(0);
            $table->decimal('gst_percentage', 5, 2)->default(12);
            $table->decimal('gst_amount', 14, 2)->default(0);
            $table->decimal('grand_total', 14, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
