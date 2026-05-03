<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Adds calculated `amount` (hank_kgs × price_per_kg) to windings, editable by the user.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('windings')) {
            return;
        }

        if (! Schema::hasColumn('windings', 'amount')) {
            Schema::table('windings', function (Blueprint $table) {
                $table->decimal('amount', 14, 2)->nullable()->after('price_per_kg');
            });
        }

        DB::table('windings')
            ->whereNull('amount')
            ->whereNotNull('hank_kgs')
            ->whereNotNull('price_per_kg')
            ->update([
                'amount' => DB::raw('ROUND(hank_kgs * price_per_kg, 2)'),
            ]);
    }

    public function down(): void
    {
        if (Schema::hasTable('windings') && Schema::hasColumn('windings', 'amount')) {
            Schema::table('windings', function (Blueprint $table) {
                $table->dropColumn('amount');
            });
        }
    }
};
