<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('yarn_orders', function (Blueprint $table) {
            $table->text('design')->nullable()->after('weaving_unit');
        });
    }

    public function down(): void
    {
        Schema::table('yarn_orders', function (Blueprint $table) {
            $table->dropColumn('design');
        });
    }
};

