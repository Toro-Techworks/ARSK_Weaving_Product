<?php

use App\Models\YarnOrder;
use App\Support\SlNumberFormatter;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('fabrics')) {
            return;
        }
        if (Schema::hasColumn('fabrics', 'sl_number')) {
            return;
        }

        Schema::table('fabrics', function (Blueprint $table) {
            $table->string('sl_number', 64)->nullable()->after('yarn_order_id');
        });

        Schema::table('fabrics', function (Blueprint $table) {
            $table->unique('sl_number');
        });

        YarnOrder::query()->orderBy('id')->chunk(50, function ($orders) {
            foreach ($orders as $yarnOrder) {
                SlNumberFormatter::refreshSlNumbersForYarnOrder((int) $yarnOrder->id);
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('fabrics', 'sl_number')) {
            return;
        }

        Schema::table('fabrics', function (Blueprint $table) {
            $table->dropUnique(['sl_number']);
            $table->dropColumn('sl_number');
        });
    }
};
