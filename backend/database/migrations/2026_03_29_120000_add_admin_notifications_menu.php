<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();
        $adminMenuId = DB::table('menus')->where('menu_key', 'admin_panel')->value('id');
        if (! $adminMenuId) {
            return;
        }

        DB::table('menus')->updateOrInsert(
            ['menu_key' => 'admin.notifications'],
            [
                'menu_name' => 'Notifications',
                'route_path' => '/admin/notifications',
                'icon' => 'Bell',
                'parent_id' => $adminMenuId,
                'sort_order' => 60,
                'status' => 'active',
                'updated_at' => $now,
                'created_at' => $now,
            ]
        );

        $menuId = DB::table('menus')->where('menu_key', 'admin.notifications')->value('id');
        if (! $menuId) {
            return;
        }

        $users = DB::table('users')
            ->leftJoin('roles', 'roles.id', '=', 'users.role_id')
            ->select('users.id as user_id', 'roles.role_name')
            ->get();

        foreach ($users as $user) {
            $isSuper = $user->role_name === 'super_admin';
            DB::table('user_menu_permissions')->updateOrInsert(
                ['user_id' => $user->user_id, 'menu_id' => $menuId],
                [
                    'view_permission' => $isSuper,
                    'edit_permission' => $isSuper,
                    'updated_at' => $now,
                    'created_at' => $now,
                ]
            );
            Cache::forget('user_menus_'.$user->user_id);
        }
    }

    public function down(): void
    {
        $menuId = DB::table('menus')->where('menu_key', 'admin.notifications')->value('id');
        if ($menuId) {
            DB::table('user_menu_permissions')->where('menu_id', $menuId)->delete();
            DB::table('menus')->where('id', $menuId)->delete();
            $userIds = DB::table('users')->pluck('id');
            foreach ($userIds as $userId) {
                Cache::forget('user_menus_'.$userId);
            }
        }
    }
};
