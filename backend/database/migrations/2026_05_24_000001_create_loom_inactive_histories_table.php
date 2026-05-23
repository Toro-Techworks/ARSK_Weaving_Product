<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loom_inactive_histories', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('loom_id');
            $table->string('previous_status', 32);
            $table->string('new_status', 32);
            $table->string('inactive_reason', 255)->nullable();
            $table->text('remarks')->nullable();
            $table->dateTime('inactive_start_date')->nullable();
            $table->dateTime('inactive_end_date')->nullable();
            $table->unsignedBigInteger('changed_by_user_id')->nullable();
            $table->timestamps();

            $table->index(['loom_id', 'inactive_start_date']);
            $table->index(['loom_id', 'inactive_end_date']);
            $table->foreign('loom_id')->references('id')->on('looms')->cascadeOnDelete();
            $table->foreign('changed_by_user_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loom_inactive_histories');
    }
};
