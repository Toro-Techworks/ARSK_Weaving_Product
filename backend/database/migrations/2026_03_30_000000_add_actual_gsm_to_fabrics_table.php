<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fabrics', function (Blueprint $table) {
            if (! Schema::hasColumn('fabrics', 'actual_gsm')) {
                $table->decimal('actual_gsm', 12, 3)->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('fabrics', function (Blueprint $table) {
            if (Schema::hasColumn('fabrics', 'actual_gsm')) {
                $table->dropColumn('actual_gsm');
            }
        });
    }
};
