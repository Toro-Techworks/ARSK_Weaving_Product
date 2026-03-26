<?php

/**
 * Note: Filename is historical (Laravel default name). This migration creates
 * `password_reset_tokens`, not `cache`. Cache tables are created in
 * 0001_01_01_000002_create_cache_table.php — do not remove either file.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('password_reset_tokens');
    }
};
