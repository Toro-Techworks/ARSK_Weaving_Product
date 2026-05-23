<?php

use App\Models\Menu;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $adminParent = Menu::query()->where('menu_key', 'admin_panel')->value('id');
        if (! $adminParent) {
            return;
        }

        $menu = Menu::updateOrCreate(
            ['menu_key' => 'admin.loom_history'],
            [
                'menu_name' => 'Loom History',
                'route_path' => '/admin/loom-history',
                'icon' => 'History',
                'parent_id' => $adminParent,
                'sort_order' => 45,
                'status' => 'active',
            ]
        );

        $now = now();
        $users = DB::table('users')
            ->leftJoin('roles', 'roles.id', '=', 'users.role_id')
            ->select('users.id as user_id', 'roles.role_name')
            ->whereIn('roles.role_name', ['super_admin', 'admin'])
            ->get();

        foreach ($users as $user) {
            DB::table('user_menu_permissions')->updateOrInsert(
                ['user_id' => $user->user_id, 'menu_id' => $menu->id],
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
        $menuId = Menu::query()->where('menu_key', 'admin.loom_history')->value('id');
        if ($menuId) {
            DB::table('user_menu_permissions')->where('menu_id', $menuId)->delete();
            Menu::query()->where('menu_key', 'admin.loom_history')->delete();
            foreach (DB::table('users')->pluck('id') as $userId) {
                Cache::forget('user_menus_'.$userId);
            }
        }
    }
};
