<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Central lookup for configurable dropdown values (code_type groups).
     * Table name follows Laravel plural convention; domain name "generic_code" in API paths.
     */
    public function up(): void
    {
        Schema::create('generic_codes', function (Blueprint $table) {
            $table->id();
            $table->string('code_type', 64)->index();
            $table->string('code_description', 255);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['code_type', 'code_description']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('generic_codes');
    }
};
