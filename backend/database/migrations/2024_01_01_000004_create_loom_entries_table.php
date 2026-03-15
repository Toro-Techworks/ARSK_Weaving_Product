<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loom_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('loom_id')->constrained()->onDelete('cascade');
            $table->date('date');
            $table->string('shift');
            $table->decimal('meters_produced', 12, 2)->default(0);
            $table->decimal('rejected_meters', 12, 2)->default(0);
            $table->string('operator_name')->nullable();
            $table->decimal('net_production', 12, 2)->default(0);
            $table->decimal('efficiency_percentage', 8, 2)->nullable();
            $table->timestamps();

            $table->unique(['loom_id', 'date', 'shift']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loom_entries');
    }
};
