<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fabrics', function (Blueprint $table) {
            $table->id();
            // yarn_orders must exist (2026_02_25_000001); legacy `orders` table is removed earlier (2026_02_23_100010).
            $table->foreignId('yarn_order_id')->constrained('yarn_orders')->cascadeOnDelete();
            $table->string('description', 255)->nullable();
            $table->string('design', 255)->nullable();
            $table->string('weave_technique', 255)->nullable();
            $table->string('warp_count', 64)->nullable();
            $table->string('warp_content', 255)->nullable();
            $table->string('weft_count', 64)->nullable();
            $table->string('weft_content', 255)->nullable();
            $table->decimal('con_final_reed', 12, 3)->nullable();
            $table->decimal('con_final_pick', 12, 3)->nullable();
            $table->decimal('con_on_loom_reed', 12, 3)->nullable();
            $table->decimal('con_on_loom_pick', 12, 3)->nullable();
            $table->decimal('gsm_required', 12, 3)->nullable();
            $table->decimal('required_width', 12, 3)->nullable();
            $table->decimal('po_quantity', 12, 3)->nullable();
            $table->decimal('price_per_metre', 12, 2)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fabrics');
    }
};
