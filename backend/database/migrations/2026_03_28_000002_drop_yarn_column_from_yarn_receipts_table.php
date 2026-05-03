<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('yarn_receipts', function (Blueprint $table) {
            $table->dropColumn('yarn');
        });
    }

    public function down(): void
    {
        Schema::table('yarn_receipts', function (Blueprint $table) {
            $table->string('yarn', 128)->nullable()->after('date');
        });
    }
};
