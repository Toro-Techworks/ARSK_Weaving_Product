<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'is_product_owner')) {
                $table->boolean('is_product_owner')->default(false)->after('status');
            }
            if (! Schema::hasColumn('users', 'is_hidden')) {
                $table->boolean('is_hidden')->default(false)->after('is_product_owner');
            }
            if (! Schema::hasColumn('users', 'last_login_at')) {
                $table->timestamp('last_login_at')->nullable()->after('is_hidden');
            }
            if (! Schema::hasColumn('users', 'force_password_change')) {
                $table->boolean('force_password_change')->default(false)->after('last_login_at');
            }
        });

        if (! Schema::hasTable('product_owner_audit_logs')) {
            Schema::create('product_owner_audit_logs', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('actor_user_id')->nullable();
                $table->unsignedBigInteger('target_user_id')->nullable();
                $table->string('action', 64);
                $table->text('description')->nullable();
                $table->string('ip_address', 45)->nullable();
                $table->text('user_agent')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamp('created_at')->useCurrent();

                $table->index(['action', 'created_at']);
                $table->index('target_user_id');
                $table->foreign('actor_user_id')->references('id')->on('users')->nullOnDelete();
                $table->foreign('target_user_id')->references('id')->on('users')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('product_owner_audit_logs');

        Schema::table('users', function (Blueprint $table) {
            foreach (['force_password_change', 'last_login_at', 'is_hidden', 'is_product_owner'] as $col) {
                if (Schema::hasColumn('users', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
