<?php

use App\Models\YarnOrder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('yarn_orders')) {
            return;
        }
        if (Schema::hasColumn('yarn_orders', 'display_order_id')) {
            return;
        }

        Schema::table('yarn_orders', function (Blueprint $table) {
            $table->string('display_order_id', 32)->nullable()->after('id');
        });

        YarnOrder::query()->orderBy('id')->chunk(100, function ($orders) {
            foreach ($orders as $order) {
                $order->persistDisplayOrderId();
            }
        });

        Schema::table('yarn_orders', function (Blueprint $table) {
            $table->unique('display_order_id');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('yarn_orders', 'display_order_id')) {
            return;
        }

        Schema::table('yarn_orders', function (Blueprint $table) {
            $table->dropUnique(['display_order_id']);
            $table->dropColumn('display_order_id');
        });
    }
};
