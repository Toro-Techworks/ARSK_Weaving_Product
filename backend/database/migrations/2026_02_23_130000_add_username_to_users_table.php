<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add username (unique, used for login). Email becomes optional.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username')->nullable()->unique()->after('name');
        });

        // Backfill username for existing users: use part before @ from email, or 'user_' . id
        $users = DB::table('users')->select('id', 'email')->get();
        $used = [];
        foreach ($users as $u) {
            $base = $u->email ? explode('@', $u->email)[0] : '';
            $base = preg_replace('/[^a-zA-Z0-9_-]/', '_', $base) ?: 'user';
            $username = $base;
            $suffix = 0;
            while (isset($used[$username]) || DB::table('users')->where('username', $username)->where('id', '!=', $u->id)->exists()) {
                $suffix++;
                $username = $base . $suffix;
            }
            $used[$username] = true;
            DB::table('users')->where('id', $u->id)->update(['username' => $username]);
        }

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE users MODIFY username VARCHAR(255) NOT NULL');
            DB::statement('ALTER TABLE users MODIFY email VARCHAR(255) NULL');
        } else {
            Schema::table('users', function (Blueprint $table) {
                $table->string('username')->nullable(false)->unique()->change();
            });
            Schema::table('users', function (Blueprint $table) {
                $table->string('email')->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE users MODIFY email VARCHAR(255) NOT NULL');
        } else {
            Schema::table('users', function (Blueprint $table) {
                $table->string('email')->nullable(false)->change();
            });
        }
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('username');
        });
    }
};
