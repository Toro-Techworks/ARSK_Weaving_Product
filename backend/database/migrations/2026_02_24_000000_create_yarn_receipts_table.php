<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('yarn_receipts', function (Blueprint $table) {
            $table->id();
            $table->string('dc_no', 64)->nullable();
            $table->string('vehicle_details', 255)->nullable();
            $table->date('date')->nullable();
            $table->string('yarn', 128)->nullable();
            $table->string('count', 64)->nullable();
            $table->string('content', 128)->nullable();
            $table->string('colour', 64)->nullable();
            $table->string('type', 32)->nullable(); // Cone / Hank
            $table->unsignedInteger('no_of_bags')->nullable();
            $table->unsignedInteger('bundles')->nullable();
            $table->unsignedInteger('knots')->nullable();
            $table->decimal('net_weight', 12, 3)->nullable();
            $table->decimal('gross_weight', 12, 3)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('yarn_receipts');
    }
};
