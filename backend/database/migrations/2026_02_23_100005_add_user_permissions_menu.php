<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Ensure "User Permissions" menu exists under Admin Panel and super_admin can see it.
     */
    public function up(): void
    {
        $adminPanel = DB::table('menus')->where('menu_key', 'admin_panel')->first();
        if (!$adminPanel) {
            return;
        }

        $menu = DB::table('menus')->where('menu_key', 'admin.permissions')->first();
        if (!$menu) {
            DB::table('menus')->insert([
                'menu_name' => 'User Permissions',
                'menu_key' => 'admin.permissions',
                'route_path' => '/admin/permissions',
                'icon' => 'ClipboardList',
                'parent_id' => $adminPanel->id,
                'sort_order' => 4,
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $menu = DB::table('menus')->where('menu_key', 'admin.permissions')->first();
        }
        if (!$menu) {
            return;
        }
        $menuId = $menu->id;

        $superAdminRole = DB::table('roles')->where('role_name', 'super_admin')->first();
        if ($superAdminRole) {
            $roleId = $superAdminRole->id;
            $exists = DB::table('role_menu_permissions')->where('role_id', $roleId)->where('menu_id', $menuId)->exists();
            if (!$exists) {
                DB::table('role_menu_permissions')->insert([
                    'role_id' => $roleId,
                    'menu_id' => $menuId,
                    'can_view' => true,
                    'can_create' => false,
                    'can_edit' => true,
                    'can_delete' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
            $userIds = DB::table('users')->where('role_id', $roleId)->pluck('id');
            foreach ($userIds as $userId) {
                $uExists = DB::table('user_menu_permissions')->where('user_id', $userId)->where('menu_id', $menuId)->exists();
                if (!$uExists) {
                    DB::table('user_menu_permissions')->insert([
                        'user_id' => $userId,
                        'menu_id' => $menuId,
                        'view_permission' => true,
                        'edit_permission' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }
    }

    public function down(): void
    {
        $menu = DB::table('menus')->where('menu_key', 'admin.permissions')->first();
        if ($menu) {
            DB::table('role_menu_permissions')->where('menu_id', $menu->id)->delete();
            DB::table('user_menu_permissions')->where('menu_id', $menu->id)->delete();
            DB::table('menus')->where('id', $menu->id)->delete();
        }
    }
};
