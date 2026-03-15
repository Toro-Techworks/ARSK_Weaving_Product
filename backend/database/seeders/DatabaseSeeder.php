<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(RolesSeeder::class);
        $this->call(MenusSeeder::class);

        $superAdminRoleId = Role::where('role_name', 'super_admin')->value('id');
        $adminRoleId = Role::where('role_name', 'admin')->value('id');
        $userRoleId = Role::where('role_name', 'user')->value('id');

        User::updateOrCreate(
            ['email' => 'superadmin@toroproduction.com'],
            [
                'name' => 'Super Admin',
                'password' => Hash::make('password'),
                'role_id' => $superAdminRoleId,
                'status' => 'active',
            ]
        );

        User::updateOrCreate(
            ['email' => 'admin@toroproduction.com'],
            [
                'name' => 'Admin',
                'password' => Hash::make('password'),
                'role_id' => $adminRoleId,
                'status' => 'active',
            ]
        );

        User::updateOrCreate(
            ['email' => 'user@toroproduction.com'],
            [
                'name' => 'User',
                'password' => Hash::make('password'),
                'role_id' => $userRoleId,
                'status' => 'active',
            ]
        );
    }
}
