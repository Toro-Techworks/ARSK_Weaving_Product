<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('weaving_units') && ! Schema::hasColumn('weaving_units', 'status')) {
            Schema::table('weaving_units', function (Blueprint $table) {
                $table->string('status', 32)->default('Active')->after('payment_terms');
            });
        }

        if (Schema::hasTable('winding_units') && ! Schema::hasColumn('winding_units', 'status')) {
            Schema::table('winding_units', function (Blueprint $table) {
                $table->string('status', 32)->default('Active')->after('payment_terms');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('weaving_units') && Schema::hasColumn('weaving_units', 'status')) {
            Schema::table('weaving_units', function (Blueprint $table) {
                $table->dropColumn('status');
            });
        }
        if (Schema::hasTable('winding_units') && Schema::hasColumn('winding_units', 'status')) {
            Schema::table('winding_units', function (Blueprint $table) {
                $table->dropColumn('status');
            });
        }
    }
};
