<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('status', 20)->default('active')->after('role');
        });

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY COLUMN role VARCHAR(32) NOT NULL DEFAULT 'user'");
        }

        // Map old roles to new RBAC roles (idempotent for fresh installs)
        DB::table('users')->where('role', 'owner')->update(['role' => 'super_admin']);
        DB::table('users')->whereIn('role', ['accountant', 'supervisor'])->update(['role' => 'admin']);
        DB::table('users')->where('role', 'data_entry')->update(['role' => 'user']);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('status');
        });
        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('owner','accountant','supervisor','data_entry') NOT NULL DEFAULT 'data_entry'");
        }
    }
};
