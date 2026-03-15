<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('yarn_requirements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('yarn_order_id')->constrained('yarn_orders')->cascadeOnDelete();
            $table->string('yarn_requirement', 255)->nullable();
            $table->string('colour', 128)->nullable();
            $table->string('count', 64)->nullable();
            $table->string('content', 255)->nullable();
            $table->decimal('required_weight', 12, 3)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('yarn_requirements');
    }
};
