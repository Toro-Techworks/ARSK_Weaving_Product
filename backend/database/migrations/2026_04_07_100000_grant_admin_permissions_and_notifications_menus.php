<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $adminRoleId = DB::table('roles')->where('role_name', 'admin')->value('id');
        if (! $adminRoleId) {
            return;
        }

        $adminUserIds = DB::table('users')->where('role_id', $adminRoleId)->pluck('id');
        if ($adminUserIds->isEmpty()) {
            return;
        }

        $now = now();
        $permissionMenuId = DB::table('menus')->where('menu_key', 'admin.permissions')->value('id');
        $notificationsMenuId = DB::table('menus')->where('menu_key', 'admin.notifications')->value('id');

        if ($permissionMenuId) {
            DB::table('user_menu_permissions')
                ->whereIn('user_id', $adminUserIds)
                ->where('menu_id', $permissionMenuId)
                ->update(['edit_permission' => true, 'view_permission' => true, 'updated_at' => $now]);
        }

        if ($notificationsMenuId) {
            DB::table('user_menu_permissions')
                ->whereIn('user_id', $adminUserIds)
                ->where('menu_id', $notificationsMenuId)
                ->update(['edit_permission' => true, 'view_permission' => true, 'updated_at' => $now]);
        }

        foreach ($adminUserIds as $userId) {
            Cache::forget('user_menus_'.$userId);
        }
    }

    public function down(): void
    {
        $adminRoleId = DB::table('roles')->where('role_name', 'admin')->value('id');
        if (! $adminRoleId) {
            return;
        }

        $adminUserIds = DB::table('users')->where('role_id', $adminRoleId)->pluck('id');
        $permissionMenuId = DB::table('menus')->where('menu_key', 'admin.permissions')->value('id');
        $notificationsMenuId = DB::table('menus')->where('menu_key', 'admin.notifications')->value('id');
        $now = now();

        if ($permissionMenuId) {
            DB::table('user_menu_permissions')
                ->whereIn('user_id', $adminUserIds)
                ->where('menu_id', $permissionMenuId)
                ->update(['edit_permission' => false, 'updated_at' => $now]);
        }

        if ($notificationsMenuId) {
            DB::table('user_menu_permissions')
                ->whereIn('user_id', $adminUserIds)
                ->where('menu_id', $notificationsMenuId)
                ->update(['edit_permission' => false, 'view_permission' => false, 'updated_at' => $now]);
        }

        foreach ($adminUserIds as $userId) {
            Cache::forget('user_menus_'.$userId);
        }
    }
};
