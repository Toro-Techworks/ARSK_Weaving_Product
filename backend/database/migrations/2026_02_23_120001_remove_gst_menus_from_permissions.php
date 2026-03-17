<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Remove GST and GST Summary from menus (and thus from user permission matrix).
     */
    public function up(): void
    {
        $menuKeys = ['gst', 'reports.gst_summary'];
        $ids = DB::table('menus')->whereIn('menu_key', $menuKeys)->pluck('id');
        if ($ids->isNotEmpty()) {
            DB::table('user_menu_permissions')->whereIn('menu_id', $ids)->delete();
            DB::table('menus')->whereIn('id', $ids)->delete();
        }
    }

    public function down(): void
    {
        // Menus were likely created via admin; we don't recreate them on rollback.
    }
};
