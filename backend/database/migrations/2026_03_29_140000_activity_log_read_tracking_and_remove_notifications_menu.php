<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('activity_logs_last_read_at')->nullable();
        });

        $menuId = DB::table('menus')->where('menu_key', 'admin.notifications')->value('id');
        if ($menuId) {
            DB::table('user_menu_permissions')->where('menu_id', $menuId)->delete();
            DB::table('menus')->where('id', $menuId)->delete();
            foreach (DB::table('users')->pluck('id') as $userId) {
                Cache::forget('user_menus_'.$userId);
            }
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('activity_logs_last_read_at');
        });
    }
};
