<?php

namespace Database\Seeders;

use App\Models\Menu;
use App\Models\Role;
use App\Models\RoleMenuPermission;
use Illuminate\Database\Seeder;

class RoleMenuPermissionSeeder extends Seeder
{
    public function run(): void
    {
        $superAdmin = Role::where('role_name', 'super_admin')->first();
        $admin = Role::where('role_name', 'admin')->first();
        $user = Role::where('role_name', 'user')->first();

        if (!$superAdmin || !$admin || !$user) {
            return;
        }

        $allMenus = Menu::all();
        $adminPanelMenuKeys = ['admin.users.create', 'admin.users', 'admin.assign-menu'];
        $adminOnlyMenuKeys = ['admin.assign-menu'];

        foreach ($allMenus as $menu) {
            RoleMenuPermission::updateOrCreate(
                ['role_id' => $superAdmin->id, 'menu_id' => $menu->id],
                ['can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true]
            );
        }

        foreach ($allMenus as $menu) {
            $isAdminPanelChild = in_array($menu->menu_key, $adminPanelMenuKeys);
            $isAdminOnly = in_array($menu->menu_key, $adminOnlyMenuKeys);
            if ($menu->menu_key === 'admin_panel' || $isAdminOnly) {
                continue;
            }
            RoleMenuPermission::updateOrCreate(
                ['role_id' => $admin->id, 'menu_id' => $menu->id],
                [
                    'can_view' => true,
                    'can_create' => $isAdminPanelChild ? true : false,
                    'can_edit' => true,
                    'can_delete' => !$isAdminPanelChild,
                ]
            );
        }

        $userMenuKeys = [
            'dashboard', 'gst', 'companies',
            'orders', 'loom_production', 'loom_production.looms', 'loom_production.daily', 'loom_production.report',
            'finance', 'payments', 'expenses', 'reports', 'reports.gst_summary', 'reports.order_summary', 'reports.loom_efficiency',
            'yarn_stock',
            'settings.profile',
        ];
        foreach ($allMenus as $menu) {
            if (!in_array($menu->menu_key, $userMenuKeys)) {
                continue;
            }
            RoleMenuPermission::updateOrCreate(
                ['role_id' => $user->id, 'menu_id' => $menu->id],
                ['can_view' => true, 'can_create' => false, 'can_edit' => false, 'can_delete' => false]
            );
        }

        $adminPanel = Menu::where('menu_key', 'admin_panel')->first();
        if ($adminPanel) {
            RoleMenuPermission::updateOrCreate(
                ['role_id' => $admin->id, 'menu_id' => $adminPanel->id],
                ['can_view' => true, 'can_create' => false, 'can_edit' => false, 'can_delete' => false]
            );
        }
    }
}
