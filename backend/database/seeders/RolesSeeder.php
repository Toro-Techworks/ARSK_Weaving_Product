<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RolesSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            [
                'role_name' => 'super_admin',
                'permissions' => json_encode([
                    'users.create', 'users.read', 'users.update', 'users.delete',
                    'users.assign_roles', 'users.create_admin', 'analytics.view', 'activity_logs.view',
                ]),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'role_name' => 'admin',
                'permissions' => json_encode([
                    'users.create', 'users.read', 'users.update',
                    'users.assign_departments', 'users.create_user',
                ]),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'role_name' => 'user',
                'permissions' => json_encode(['production.view', 'production.enter']),
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        foreach ($roles as $role) {
            DB::table('roles')->updateOrInsert(
                ['role_name' => $role['role_name']],
                $role
            );
        }
    }
}
