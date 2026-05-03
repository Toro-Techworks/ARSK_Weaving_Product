<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Winding entries: hank going OUT to a winding unit, cones coming IN.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('windings')) {
            return;
        }

        Schema::create('windings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('winding_unit_id')
                ->constrained('winding_units')
                ->restrictOnDelete();
            $table->date('outward_date')->nullable();
            $table->date('inward_date')->nullable();
            $table->decimal('price_per_kg', 12, 2)->nullable();
            $table->string('order_from', 255)->nullable();
            $table->foreignId('yarn_order_id')
                ->nullable()
                ->constrained('yarn_orders')
                ->nullOnDelete();
            $table->decimal('hank_kgs', 12, 3)->nullable();
            $table->decimal('cone_kgs', 12, 3)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['winding_unit_id', 'outward_date']);
            $table->index(['yarn_order_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('windings');
    }
};
