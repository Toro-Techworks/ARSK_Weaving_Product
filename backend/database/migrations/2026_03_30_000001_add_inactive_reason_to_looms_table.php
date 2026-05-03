<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('looms', function (Blueprint $table) {
            $table->text('inactive_reason')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('looms', function (Blueprint $table) {
            $table->dropColumn('inactive_reason');
        });
    }
};
