<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Remove "Assign menu to role" feature: delete menu row and drop role_menu_permissions table.
     */
    public function up(): void
    {
        $menu = DB::table('menus')->where('menu_key', 'admin.assign-menu')->first();
        if ($menu) {
            DB::table('user_menu_permissions')->where('menu_id', $menu->id)->delete();
            DB::table('menus')->where('id', $menu->id)->delete();
        }

        Schema::dropIfExists('role_menu_permissions');
    }

    public function down(): void
    {
        Schema::create('role_menu_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('role_id')->constrained('roles')->cascadeOnDelete();
            $table->foreignId('menu_id')->constrained('menus')->cascadeOnDelete();
            $table->boolean('can_view')->default(true);
            $table->boolean('can_create')->default(false);
            $table->boolean('can_edit')->default(false);
            $table->boolean('can_delete')->default(false);
            $table->timestamps();
            $table->unique(['role_id', 'menu_id']);
        });

        $adminPanel = DB::table('menus')->where('menu_key', 'admin_panel')->first();
        if ($adminPanel) {
            DB::table('menus')->insert([
                'menu_name' => 'Assign Menu to Role',
                'menu_key' => 'admin.assign-menu',
                'route_path' => '/admin/assign-menu',
                'icon' => 'List',
                'parent_id' => $adminPanel->id,
                'sort_order' => 2,
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
};
