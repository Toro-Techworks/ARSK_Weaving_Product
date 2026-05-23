<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $menuId = DB::table('menus')->where('menu_key', 'admin.loom_history')->value('id');
        if (! $menuId) {
            return;
        }

        $now = now();
        $users = DB::table('users')
            ->leftJoin('roles', 'roles.id', '=', 'users.role_id')
            ->select('users.id as user_id', 'roles.role_name')
            ->whereIn('roles.role_name', ['super_admin', 'admin'])
            ->get();

        foreach ($users as $user) {
            DB::table('user_menu_permissions')->updateOrInsert(
                ['user_id' => $user->user_id, 'menu_id' => $menuId],
                [
                    'view_permission' => true,
                    'edit_permission' => true,
                    'updated_at' => $now,
                    'created_at' => $now,
                ]
            );
            Cache::forget('user_menus_'.$user->user_id);
        }
    }

    public function down(): void
    {
        $menuId = DB::table('menus')->where('menu_key', 'admin.loom_history')->value('id');
        if (! $menuId) {
            return;
        }

        $adminRoleIds = DB::table('roles')
            ->whereIn('role_name', ['super_admin', 'admin'])
            ->pluck('id');
        $userIds = DB::table('users')->whereIn('role_id', $adminRoleIds)->pluck('id');

        DB::table('user_menu_permissions')
            ->where('menu_id', $menuId)
            ->whereIn('user_id', $userIds)
            ->delete();

        foreach ($userIds as $userId) {
            Cache::forget('user_menus_'.$userId);
        }
    }
};
