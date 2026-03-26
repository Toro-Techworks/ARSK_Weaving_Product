<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('weaving_units', function (Blueprint $table) {
            $table->id();
            $table->string('company_name', 255);
            $table->string('gst_number', 50)->nullable();
            $table->text('address')->nullable();
            $table->string('contact_person', 255)->nullable();
            $table->string('phone', 20)->nullable();
            $table->string('payment_terms', 255)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('weaving_units');
    }
};
