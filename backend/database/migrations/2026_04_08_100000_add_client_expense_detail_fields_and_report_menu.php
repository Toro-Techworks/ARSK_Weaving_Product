<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->string('design', 255)->nullable()->after('yarn_order_id');
            $table->string('size', 255)->nullable()->after('design');
            $table->decimal('meter', 14, 4)->nullable()->after('size');
            $table->decimal('rate_per_meter', 14, 4)->nullable()->after('meter');
        });

        $now = now();
        $parentId = DB::table('menus')->where('menu_key', 'reports')->value('id');
        if ($parentId) {
            DB::table('menus')->updateOrInsert(
                ['menu_key' => 'reports.client_expenses'],
                [
                    'menu_name' => 'Client expense report',
                    'route_path' => '/reports/client-expenses',
                    'icon' => 'TrendingDown',
                    'parent_id' => $parentId,
                    'sort_order' => 20,
                    'status' => 'active',
                    'updated_at' => $now,
                    'created_at' => $now,
                ]
            );

            $menuId = DB::table('menus')->where('menu_key', 'reports.client_expenses')->value('id');
            if ($menuId) {
                $userIds = DB::table('users')->pluck('id');
                foreach ($userIds as $userId) {
                    DB::table('user_menu_permissions')->updateOrInsert(
                        ['user_id' => $userId, 'menu_id' => $menuId],
                        [
                            'view_permission' => true,
                            'edit_permission' => false,
                            'updated_at' => $now,
                            'created_at' => $now,
                        ]
                    );
                    Cache::forget('user_menus_'.$userId);
                }
            }
        }
    }

    public function down(): void
    {
        $menuId = DB::table('menus')->where('menu_key', 'reports.client_expenses')->value('id');
        if ($menuId) {
            DB::table('user_menu_permissions')->where('menu_id', $menuId)->delete();
            DB::table('menus')->where('id', $menuId)->delete();
            foreach (DB::table('users')->pluck('id') as $userId) {
                Cache::forget('user_menus_'.$userId);
            }
        }

        Schema::table('expenses', function (Blueprint $table) {
            $table->dropColumn(['design', 'size', 'meter', 'rate_per_meter']);
        });
    }
};
