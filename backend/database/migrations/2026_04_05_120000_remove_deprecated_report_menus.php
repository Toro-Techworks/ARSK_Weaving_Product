<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Remove yarn consumption, order summary, and loom efficiency report menus (and permission rows).
     * Clears per-user menu API cache so the sidebar updates immediately (see MenuController).
     */
    public function up(): void
    {
        $menuKeys = [
            'reports.yarn_consumption',
            'reports.order_summary',
            'reports.loom_efficiency',
        ];

        $routePaths = [
            '/reports/yarn-consumption',
            '/reports/order-summary',
            '/reports/loom-efficiency',
        ];

        $ids = DB::table('menus')
            ->where(function ($q) use ($menuKeys, $routePaths) {
                $q->whereIn('menu_key', $menuKeys)
                    ->orWhereIn('route_path', $routePaths);
            })
            ->pluck('id')
            ->unique()
            ->values();

        if ($ids->isNotEmpty()) {
            if (Schema::hasTable('user_menu_permissions')) {
                DB::table('user_menu_permissions')->whereIn('menu_id', $ids)->delete();
            }
            if (Schema::hasTable('role_menu_permissions')) {
                DB::table('role_menu_permissions')->whereIn('menu_id', $ids)->delete();
            }

            DB::table('menus')->whereIn('id', $ids)->delete();
        }

        foreach (DB::table('users')->pluck('id') as $userId) {
            Cache::forget('user_menus_'.$userId);
        }
    }

    public function down(): void
    {
        // Intentionally empty: removed features are not restored on rollback.
    }
};
