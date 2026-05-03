<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Classifies codes for grouping/filtering (e.g. CORE vs future extension types).
     * Maps to domain name "DropDown_type"; stored as dropdown_type (snake_case).
     */
    public function up(): void
    {
        Schema::table('generic_codes', function (Blueprint $table) {
            $table->string('dropdown_type', 64)->default('CORE');
        });
    }

    public function down(): void
    {
        Schema::table('generic_codes', function (Blueprint $table) {
            $table->dropColumn('dropdown_type');
        });
    }
};
