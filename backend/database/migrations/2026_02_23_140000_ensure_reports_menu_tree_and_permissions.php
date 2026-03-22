<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Ensures Reports parent exists and all four report submenus are present with routes.
     * Grants view permission to all users so reports are visible after deploy.
     */
    public function up(): void
    {
        $now = now();

        $parent = DB::table('menus')->where('menu_key', 'reports')->first();
        if (!$parent) {
            $parentId = DB::table('menus')->insertGetId([
                'menu_name' => 'Reports',
                'menu_key' => 'reports',
                'route_path' => null,
                'icon' => 'FileBarChart',
                'parent_id' => null,
                'sort_order' => 80,
                'status' => 'active',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        } else {
            $parentId = $parent->id;
        }

        $children = [
            ['menu_key' => 'reports.production', 'menu_name' => 'Production Report', 'route_path' => '/reports/production', 'sort_order' => 10],
            ['menu_key' => 'reports.yarn_consumption', 'menu_name' => 'Yarn Consumption Report', 'route_path' => '/reports/yarn-consumption', 'sort_order' => 20],
            ['menu_key' => 'reports.order_summary', 'menu_name' => 'Order Summary', 'route_path' => '/reports/order-summary', 'sort_order' => 30],
            ['menu_key' => 'reports.loom_efficiency', 'menu_name' => 'Loom Efficiency', 'route_path' => '/reports/loom-efficiency', 'sort_order' => 40],
        ];

        foreach ($children as $c) {
            $row = DB::table('menus')->where('menu_key', $c['menu_key'])->first();
            if (!$row) {
                DB::table('menus')->insert([
                    'menu_name' => $c['menu_name'],
                    'menu_key' => $c['menu_key'],
                    'route_path' => $c['route_path'],
                    'icon' => 'FileBarChart',
                    'parent_id' => $parentId,
                    'sort_order' => $c['sort_order'],
                    'status' => 'active',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            } else {
                DB::table('menus')->where('id', $row->id)->update([
                    'parent_id' => $parentId,
                    'route_path' => $c['route_path'],
                    'menu_name' => $c['menu_name'],
                    'sort_order' => $c['sort_order'],
                    'updated_at' => $now,
                ]);
            }
        }

        $menuIds = DB::table('menus')->whereIn('menu_key', [
            'reports',
            'reports.production',
            'reports.yarn_consumption',
            'reports.order_summary',
            'reports.loom_efficiency',
        ])->pluck('id');

        $userIds = DB::table('users')->pluck('id');
        foreach ($userIds as $userId) {
            foreach ($menuIds as $menuId) {
                $has = DB::table('user_menu_permissions')
                    ->where('user_id', $userId)
                    ->where('menu_id', $menuId)
                    ->exists();
                if (!$has) {
                    DB::table('user_menu_permissions')->insert([
                        'user_id' => $userId,
                        'menu_id' => $menuId,
                        'view_permission' => true,
                        'edit_permission' => false,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }
            }
        }
    }

    public function down(): void
    {
        // Non-destructive: do not remove menus that may be referenced elsewhere.
    }
};
