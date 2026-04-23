<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Track per-assignment snapshots of what fabric (design/weave/colour) a loom was
 * running, so historical (past-date) Daily Entry rows can keep showing what was
 * actually running on that date even after the loom is reassigned.
 *
 * Effective assignment for (loom, date) = latest row where assigned_at <= end_of(date).
 *
 * Baseline: seed one row per currently-assigned fabric with a far-back timestamp
 * so all existing dates resolve to the current assignment until the next change.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loom_assignment_history', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('loom_id');
            $table->unsignedBigInteger('fabric_id')->nullable();
            $table->unsignedBigInteger('yarn_order_id')->nullable();
            $table->string('sl_number', 64)->nullable();
            $table->string('design', 255)->nullable();
            $table->string('weave_technique', 255)->nullable();
            $table->string('colour', 512)->nullable();
            $table->dateTime('assigned_at')->index();
            $table->timestamps();

            $table->index(['loom_id', 'assigned_at']);
            $table->foreign('loom_id')->references('id')->on('looms')->cascadeOnDelete();
            $table->foreign('fabric_id')->references('id')->on('fabrics')->nullOnDelete();
        });

        // Baseline: record current assignments at a far-back date so any past date
        // in the visible Daily Entry window resolves to today's assignment until a
        // new snapshot is inserted (via a future reassignment).
        $baselineAt = '2000-01-01 00:00:00';
        $rows = DB::table('fabrics')
            ->whereNotNull('loom_id')
            ->get(['id', 'loom_id', 'yarn_order_id', 'sl_number', 'design', 'weave_technique', 'colour']);

        foreach ($rows as $r) {
            DB::table('loom_assignment_history')->insert([
                'loom_id' => (int) $r->loom_id,
                'fabric_id' => (int) $r->id,
                'yarn_order_id' => $r->yarn_order_id !== null ? (int) $r->yarn_order_id : null,
                'sl_number' => $r->sl_number,
                'design' => $r->design,
                'weave_technique' => $r->weave_technique,
                'colour' => $r->colour,
                'assigned_at' => $baselineAt,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('loom_assignment_history');
    }
};
