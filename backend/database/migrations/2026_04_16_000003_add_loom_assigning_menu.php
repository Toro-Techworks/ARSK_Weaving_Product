<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $parentId = DB::table('menus')->where('menu_key', 'loom_production')->value('id');
        if (! $parentId) {
            return;
        }

        DB::table('menus')->updateOrInsert(
            ['menu_key' => 'loom_production.assigning'],
            [
                'menu_name' => 'Loom Assigning',
                'route_path' => '/loom-production/assigning',
                'icon' => 'Factory',
                'parent_id' => $parentId,
                'sort_order' => 30,
                'status' => 'active',
            ]
        );

        $menuId = DB::table('menus')->where('menu_key', 'loom_production.assigning')->value('id');
        if ($menuId) {
            foreach (User::query()->pluck('id') as $userId) {
                DB::table('user_menu_permissions')->updateOrInsert(
                    ['user_id' => $userId, 'menu_id' => $menuId],
                    ['view_permission' => true, 'edit_permission' => true, 'updated_at' => now(), 'created_at' => now()]
                );
                Cache::forget('user_menus_'.$userId);
            }
        }
    }

    public function down(): void
    {
        $menuId = DB::table('menus')->where('menu_key', 'loom_production.assigning')->value('id');
        if ($menuId) {
            DB::table('user_menu_permissions')->where('menu_id', $menuId)->delete();
            DB::table('menus')->where('id', $menuId)->delete();
            foreach (User::query()->pluck('id') as $userId) {
                Cache::forget('user_menus_'.$userId);
            }
        }
    }
};
