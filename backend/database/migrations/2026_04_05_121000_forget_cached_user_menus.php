<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Bust MenuController cache (user_menus_{id}) so sidebars reflect DB after report menus were removed.
     * Safe if a prior deploy ran the removal migration without cache invalidation.
     */
    public function up(): void
    {
        foreach (DB::table('users')->pluck('id') as $userId) {
            Cache::forget('user_menus_'.$userId);
        }
    }

    public function down(): void
    {
        //
    }
};
