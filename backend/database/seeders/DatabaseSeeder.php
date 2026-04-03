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
        $this->call(GenericCodeSeeder::class);

        $superAdminRoleId = Role::where('role_name', 'super_admin')->value('id');
        $adminRoleId = Role::where('role_name', 'admin')->value('id');
        $userRoleId = Role::where('role_name', 'user')->value('id');

        User::updateOrCreate(
            ['username' => 'superadmin'],
            [
                'name' => 'Super Admin',
                'password' => Hash::make('password'),
                'role_id' => $superAdminRoleId,
                'status' => 'active',
            ]
        );

        User::updateOrCreate(
            ['username' => 'admin'],
            [
                'name' => 'Admin',
                'password' => Hash::make('password'),
                'role_id' => $adminRoleId,
                'status' => 'active',
            ]
        );

        User::updateOrCreate(
            ['username' => 'user'],
            [
                'name' => 'User',
                'password' => Hash::make('password'),
                'role_id' => $userRoleId,
                'status' => 'active',
            ]
        );

        // Menus + user_menu_permissions (requires users)
        $this->call(MenusSeeder::class);
    }
}
