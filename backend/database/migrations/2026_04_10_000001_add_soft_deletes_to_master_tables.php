<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('weaving_units', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('yarn_orders', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('weavers', function (Blueprint $table) {
            $table->dropUnique(['employee_code']);
            $table->index('employee_code');
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('weavers', function (Blueprint $table) {
            $table->dropSoftDeletes();
            $table->dropIndex(['employee_code']);
            $table->unique('employee_code');
        });

        Schema::table('yarn_orders', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('weaving_units', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('companies', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
