<?php

namespace Database\Seeders;

use App\Models\Menu;
use App\Models\User;
use App\Models\UserMenuPermission;
use Illuminate\Database\Seeder;

class MenusSeeder extends Seeder
{
    /**
     * Seed sidebar menus (idempotent by menu_key) and grant user_menu_permissions.
     * Run after roles and users exist.
     */
    public function run(): void
    {
        /** @var array<string, int> $ids menu_key => id */
        $ids = [];

        $topLevel = [
            ['menu_key' => 'dashboard', 'menu_name' => 'Dashboard', 'route_path' => '/', 'icon' => 'LayoutDashboard', 'sort_order' => 10],
            ['menu_key' => 'companies', 'menu_name' => 'Companies', 'route_path' => '/companies', 'icon' => 'Building2', 'sort_order' => 20],
            ['menu_key' => 'orders', 'menu_name' => 'Orders', 'route_path' => '/orders', 'icon' => 'ClipboardList', 'sort_order' => 30],
            ['menu_key' => 'loom_production', 'menu_name' => 'Loom Production', 'route_path' => null, 'icon' => 'Factory', 'sort_order' => 40],
            ['menu_key' => 'payments', 'menu_name' => 'Payments', 'route_path' => '/payments', 'icon' => 'Wallet', 'sort_order' => 50],
            ['menu_key' => 'expenses', 'menu_name' => 'Expenses', 'route_path' => '/expenses', 'icon' => 'TrendingDown', 'sort_order' => 60],
            ['menu_key' => 'yarn_stock', 'menu_name' => 'Yarn Stock', 'route_path' => '/yarn-stock', 'icon' => 'Package', 'sort_order' => 70],
            ['menu_key' => 'reports', 'menu_name' => 'Reports', 'route_path' => null, 'icon' => 'FileBarChart', 'sort_order' => 80],
            ['menu_key' => 'admin_panel', 'menu_name' => 'Administration', 'route_path' => null, 'icon' => 'Shield', 'sort_order' => 90],
        ];

        foreach ($topLevel as $row) {
            $menu = Menu::updateOrCreate(
                ['menu_key' => $row['menu_key']],
                [
                    'menu_name' => $row['menu_name'],
                    'route_path' => $row['route_path'],
                    'icon' => $row['icon'],
                    'parent_id' => null,
                    'sort_order' => $row['sort_order'],
                    'status' => 'active',
                ]
            );
            $ids[$row['menu_key']] = $menu->id;
        }

        $loomParent = $ids['loom_production'];
        foreach ([
            ['menu_key' => 'loom_production.looms', 'menu_name' => 'Looms', 'route_path' => '/loom-production/looms', 'sort_order' => 10],
            ['menu_key' => 'loom_production.daily', 'menu_name' => 'Daily Entry', 'route_path' => '/loom-production/daily', 'sort_order' => 20],
            ['menu_key' => 'loom_production.report', 'menu_name' => 'Production Report', 'route_path' => '/loom-production/report', 'sort_order' => 30],
        ] as $row) {
            $menu = Menu::updateOrCreate(
                ['menu_key' => $row['menu_key']],
                [
                    'menu_name' => $row['menu_name'],
                    'route_path' => $row['route_path'],
                    'icon' => 'Factory',
                    'parent_id' => $loomParent,
                    'sort_order' => $row['sort_order'],
                    'status' => 'active',
                ]
            );
            $ids[$row['menu_key']] = $menu->id;
        }

        $reportsParent = $ids['reports'];
        foreach ([
            ['menu_key' => 'reports.production', 'menu_name' => 'Production Report', 'route_path' => '/reports/production', 'sort_order' => 10],
            ['menu_key' => 'reports.yarn_consumption', 'menu_name' => 'Yarn Consumption Report', 'route_path' => '/reports/yarn-consumption', 'sort_order' => 20],
            ['menu_key' => 'reports.order_summary', 'menu_name' => 'Order Summary', 'route_path' => '/reports/order-summary', 'sort_order' => 30],
            ['menu_key' => 'reports.loom_efficiency', 'menu_name' => 'Loom Efficiency', 'route_path' => '/reports/loom-efficiency', 'sort_order' => 40],
        ] as $row) {
            $menu = Menu::updateOrCreate(
                ['menu_key' => $row['menu_key']],
                [
                    'menu_name' => $row['menu_name'],
                    'route_path' => $row['route_path'],
                    'icon' => 'FileBarChart',
                    'parent_id' => $reportsParent,
                    'sort_order' => $row['sort_order'],
                    'status' => 'active',
                ]
            );
            $ids[$row['menu_key']] = $menu->id;
        }

        $adminParent = $ids['admin_panel'];
        foreach ([
            ['menu_key' => 'admin.users', 'menu_name' => 'Users', 'route_path' => '/admin/users', 'icon' => 'Users', 'sort_order' => 10],
            ['menu_key' => 'admin.permissions', 'menu_name' => 'User Permissions', 'route_path' => '/admin/permissions', 'icon' => 'ClipboardList', 'sort_order' => 20],
            ['menu_key' => 'admin.weaving_units', 'menu_name' => 'Weaving Unit', 'route_path' => '/admin/weaving-units', 'icon' => 'Factory', 'sort_order' => 30],
            ['menu_key' => 'admin.weavers', 'menu_name' => 'Weavers', 'route_path' => '/admin/weavers', 'icon' => 'Users', 'sort_order' => 40],
        ] as $row) {
            $menu = Menu::updateOrCreate(
                ['menu_key' => $row['menu_key']],
                [
                    'menu_name' => $row['menu_name'],
                    'route_path' => $row['route_path'],
                    'icon' => $row['icon'],
                    'parent_id' => $adminParent,
                    'sort_order' => $row['sort_order'],
                    'status' => 'active',
                ]
            );
            $ids[$row['menu_key']] = $menu->id;
        }

        $this->syncUserMenuPermissions();
    }

    private function syncUserMenuPermissions(): void
    {
        $menus = Menu::query()->get(['id', 'menu_key']);
        if ($menus->isEmpty()) {
            return;
        }

        foreach (User::query()->with('role')->cursor() as $user) {
            $roleName = $user->role?->role_name;
            foreach ($menus as $menu) {
                $view = true;
                $edit = false;
                if ($roleName === 'super_admin') {
                    $edit = true;
                } elseif ($roleName === 'admin') {
                    $edit = $menu->menu_key !== 'admin.permissions';
                }

                UserMenuPermission::updateOrCreate(
                    [
                        'user_id' => $user->id,
                        'menu_id' => $menu->id,
                    ],
                    [
                        'view_permission' => $view,
                        'edit_permission' => $edit,
                        'updated_at' => now(),
                    ]
                );
            }
        }
    }
}
