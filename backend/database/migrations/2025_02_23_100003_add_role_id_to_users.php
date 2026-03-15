<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::table('roles')->count() === 0) {
            $now = now();
            DB::table('roles')->insert([
                ['id' => 1, 'role_name' => 'super_admin', 'description' => 'Full system access', 'permissions' => null, 'created_at' => $now, 'updated_at' => $now],
                ['id' => 2, 'role_name' => 'admin', 'description' => 'Operational and user management', 'permissions' => null, 'created_at' => $now, 'updated_at' => $now],
                ['id' => 3, 'role_name' => 'user', 'description' => 'Operational modules only', 'permissions' => null, 'created_at' => $now, 'updated_at' => $now],
            ]);
        }

        Schema::table('users', function (Blueprint $table) {
            $table->unsignedBigInteger('role_id')->nullable()->after('password');
        });

        $roleMap = [
            'super_admin' => 1,
            'admin' => 2,
            'user' => 3,
            'owner' => 1,
        ];
        foreach ($roleMap as $roleName => $roleId) {
            DB::table('users')->where('role', $roleName)->update(['role_id' => $roleId]);
        }
        DB::table('users')->whereNull('role_id')->update(['role_id' => 3]);

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('role');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreign('role_id')->references('id')->on('roles')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 32)->nullable()->after('role_id');
        });
        $idToRole = [1 => 'super_admin', 2 => 'admin', 3 => 'user'];
        foreach ($idToRole as $id => $role) {
            DB::table('users')->where('role_id', $id)->update(['role' => $role]);
        }
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['role_id']);
        });
    }
};
