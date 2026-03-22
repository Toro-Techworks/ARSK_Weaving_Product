<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $reportParent = DB::table('menus')->where('menu_key', 'reports')->first();
        $parentId = $reportParent?->id;

        $toInsert = [
            [
                'menu_key' => 'reports.production',
                'menu_name' => 'Production Report',
                'route_path' => '/reports/production',
                'icon' => 'FileBarChart',
                'parent_id' => $parentId,
                'sort_order' => 20,
            ],
            [
                'menu_key' => 'reports.yarn_consumption',
                'menu_name' => 'Yarn Consumption Report',
                'route_path' => '/reports/yarn-consumption',
                'icon' => 'FileBarChart',
                'parent_id' => $parentId,
                'sort_order' => 30,
            ],
        ];

        foreach ($toInsert as $m) {
            $exists = DB::table('menus')->where('menu_key', $m['menu_key'])->exists();
            if (!$exists) {
                DB::table('menus')->insert([
                    'menu_name' => $m['menu_name'],
                    'menu_key' => $m['menu_key'],
                    'route_path' => $m['route_path'],
                    'icon' => $m['icon'],
                    'parent_id' => $m['parent_id'],
                    'sort_order' => $m['sort_order'],
                    'status' => 'active',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // Grant view permission to all users by default.
        $menuIds = DB::table('menus')->whereIn('menu_key', ['reports.production', 'reports.yarn_consumption'])->pluck('id');
        if ($menuIds->isEmpty()) return;

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
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }
    }

    public function down(): void
    {
        DB::table('user_menu_permissions')->whereIn('menu_id', function ($q) {
            $q->select('id')->from('menus')->whereIn('menu_key', ['reports.production', 'reports.yarn_consumption']);
        })->delete();
        DB::table('menus')->whereIn('menu_key', ['reports.production', 'reports.yarn_consumption'])->delete();
    }
};

