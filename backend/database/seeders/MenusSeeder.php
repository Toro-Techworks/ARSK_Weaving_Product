<?php

namespace Database\Seeders;

use App\Models\Menu;
use App\Models\RoleMenuPermission;
use Illuminate\Database\Seeder;

class MenusSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            ['menu_name' => 'Dashboard', 'menu_key' => 'dashboard', 'route_path' => '/', 'icon' => 'LayoutDashboard', 'parent_key' => null, 'sort_order' => 0],
            ['menu_name' => 'GST', 'menu_key' => 'gst', 'route_path' => '/gst/in', 'icon' => 'Receipt', 'parent_key' => null, 'sort_order' => 10],
            ['menu_name' => 'Companies', 'menu_key' => 'companies', 'route_path' => '/companies', 'icon' => 'Building2', 'parent_key' => null, 'sort_order' => 20],
            ['menu_name' => 'Orders', 'menu_key' => 'orders', 'route_path' => '/orders', 'icon' => 'FileText', 'parent_key' => null, 'sort_order' => 30],
            ['menu_name' => 'Loom Production', 'menu_key' => 'loom_production', 'route_path' => null, 'icon' => 'Factory', 'parent_key' => null, 'sort_order' => 40],
            ['menu_name' => 'Looms', 'menu_key' => 'loom_production.looms', 'route_path' => '/loom-production/looms', 'icon' => null, 'parent_key' => 'loom_production', 'sort_order' => 1],
            ['menu_name' => 'Daily Entry', 'menu_key' => 'loom_production.daily', 'route_path' => '/loom-production/daily', 'icon' => null, 'parent_key' => 'loom_production', 'sort_order' => 2],
            ['menu_name' => 'Production Report', 'menu_key' => 'loom_production.report', 'route_path' => '/loom-production/report', 'icon' => null, 'parent_key' => 'loom_production', 'sort_order' => 3],
            ['menu_name' => 'Finance', 'menu_key' => 'finance', 'route_path' => null, 'icon' => 'Wallet', 'parent_key' => null, 'sort_order' => 50],
            ['menu_name' => 'Payments', 'menu_key' => 'payments', 'route_path' => '/payments', 'icon' => null, 'parent_key' => 'finance', 'sort_order' => 1],
            ['menu_name' => 'Expenses', 'menu_key' => 'expenses', 'route_path' => '/expenses', 'icon' => null, 'parent_key' => 'finance', 'sort_order' => 2],
            ['menu_name' => 'Reports', 'menu_key' => 'reports', 'route_path' => null, 'icon' => 'FileBarChart', 'parent_key' => null, 'sort_order' => 60],
            ['menu_name' => 'GST Summary', 'menu_key' => 'reports.gst_summary', 'route_path' => '/reports/gst-summary', 'icon' => null, 'parent_key' => 'reports', 'sort_order' => 1],
            ['menu_name' => 'Order Summary', 'menu_key' => 'reports.order_summary', 'route_path' => '/reports/order-summary', 'icon' => null, 'parent_key' => 'reports', 'sort_order' => 2],
            ['menu_name' => 'Loom Efficiency', 'menu_key' => 'reports.loom_efficiency', 'route_path' => '/reports/loom-efficiency', 'icon' => null, 'parent_key' => 'reports', 'sort_order' => 3],
            ['menu_name' => 'Yarn Stock', 'menu_key' => 'yarn_stock', 'route_path' => '/yarn-stock', 'icon' => 'Package', 'parent_key' => null, 'sort_order' => 70],
            ['menu_name' => 'Admin Panel', 'menu_key' => 'admin_panel', 'route_path' => null, 'icon' => 'Shield', 'parent_key' => null, 'sort_order' => 100],
            ['menu_name' => 'Create User', 'menu_key' => 'admin.users.create', 'route_path' => '/admin/users/create', 'icon' => 'UserPlus', 'parent_key' => 'admin_panel', 'sort_order' => 1],
            ['menu_name' => 'Manage Users', 'menu_key' => 'admin.users', 'route_path' => '/admin/users', 'icon' => 'Users', 'parent_key' => 'admin_panel', 'sort_order' => 2],
            ['menu_name' => 'Assign Menu to Role', 'menu_key' => 'admin.assign-menu', 'route_path' => '/admin/assign-menu', 'icon' => 'Key', 'parent_key' => 'admin_panel', 'sort_order' => 3],
            ['menu_name' => 'Profile', 'menu_key' => 'settings.profile', 'route_path' => '/settings/profile', 'icon' => null, 'parent_key' => null, 'sort_order' => 200],
        ];

        foreach (['admin.activity_logs', 'admin.roles', 'admin.menus', 'orders.create', 'orders.list', 'gst.in', 'gst.out', 'companies.add', 'companies.list'] as $key) {
            $menu = Menu::where('menu_key', $key)->first();
            if ($menu) {
                RoleMenuPermission::where('menu_id', $menu->id)->delete();
                $menu->delete();
            }
        }

        foreach ($rows as $r) {
            $parentKey = $r['parent_key'] ?? null;
            unset($r['parent_key']);
            $r['parent_id'] = null;
            $r['status'] = 'active';
            Menu::updateOrCreate(['menu_key' => $r['menu_key']], $r);
        }

        foreach ($rows as $r) {
            if (!empty($r['parent_key'])) {
                $parent = Menu::where('menu_key', $r['parent_key'])->first();
                if ($parent) {
                    Menu::where('menu_key', $r['menu_key'])->update(['parent_id' => $parent->id]);
                }
            }
        }
    }
}
