<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (! DB::getSchemaBuilder()->hasTable('menus')) {
            return;
        }
        $ids = DB::table('menus')->where('menu_key', 'loom_production.report')->pluck('id');
        if ($ids->isEmpty()) {
            return;
        }
        if (DB::getSchemaBuilder()->hasTable('user_menu_permissions')) {
            DB::table('user_menu_permissions')->whereIn('menu_id', $ids)->delete();
        }
        DB::table('menus')->whereIn('id', $ids)->delete();
    }

    public function down(): void
    {
        // Re-run MenusSeeder if the row should be restored.
    }
};
