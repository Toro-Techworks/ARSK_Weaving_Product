<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Remove "Create User" from the menu table (and its user_menu_permissions).
     * Create User is now only available via the button on Manage Users screen (pop-up form).
     */
    public function up(): void
    {
        $menu = DB::table('menus')->where('menu_key', 'admin.users.create')->first();
        if ($menu) {
            DB::table('user_menu_permissions')->where('menu_id', $menu->id)->delete();
            DB::table('menus')->where('id', $menu->id)->delete();
        }
    }

    public function down(): void
    {
        $adminPanel = DB::table('menus')->where('menu_key', 'admin_panel')->first();
        if (!$adminPanel) {
            return;
        }
        if (DB::table('menus')->where('menu_key', 'admin.users.create')->exists()) {
            return;
        }
        DB::table('menus')->insert([
            'menu_name' => 'Create User',
            'menu_key' => 'admin.users.create',
            'route_path' => '/admin/users/create',
            'icon' => 'UserPlus',
            'parent_id' => $adminPanel->id,
            'sort_order' => 2,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
};
