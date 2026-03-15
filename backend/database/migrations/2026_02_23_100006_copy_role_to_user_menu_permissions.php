<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * One-time copy: for each user, insert user_menu_permissions from their role's role_menu_permissions.
     */
    public function up(): void
    {
        $users = DB::table('users')->whereNotNull('role_id')->get(['id', 'role_id']);
        $rolePermsByRole = DB::table('role_menu_permissions')->get()->groupBy('role_id');
        $existing = DB::table('user_menu_permissions')->get()->keyBy(fn ($r) => $r->user_id . '-' . $r->menu_id);

        $inserts = [];
        foreach ($users as $user) {
            $perms = $rolePermsByRole->get($user->role_id, collect());
            foreach ($perms as $rp) {
                $key = $user->id . '-' . $rp->menu_id;
                if ($existing->has($key)) {
                    continue;
                }
                $inserts[] = [
                    'user_id' => $user->id,
                    'menu_id' => $rp->menu_id,
                    'view_permission' => (bool) $rp->can_view,
                    'edit_permission' => (bool) $rp->can_edit,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
                $existing->put($key, true);
            }
        }
        if (!empty($inserts)) {
            foreach (array_chunk($inserts, 500) as $chunk) {
                DB::table('user_menu_permissions')->insert($chunk);
            }
        }
    }

    public function down(): void
    {
        //
    }
};
