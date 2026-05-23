<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Date-range loom → order (yarn order + fabric line) assignments for Daily Entry.
 * Design / weave / colour are denormalized from the assigned fabric at assign time.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loom_order_assignments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('loom_id');
            $table->unsignedBigInteger('order_id');
            $table->unsignedBigInteger('fabric_id')->nullable();
            $table->string('design', 255)->nullable();
            $table->string('weave_technique', 255)->nullable();
            $table->string('colour', 512)->nullable();
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->index(['loom_id', 'start_date']);
            $table->foreign('loom_id')->references('id')->on('looms')->cascadeOnDelete();
            $table->foreign('order_id')->references('id')->on('yarn_orders')->cascadeOnDelete();
            $table->foreign('fabric_id')->references('id')->on('fabrics')->nullOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
        });

        $this->backfillFromCurrentFabrics();
    }

    public function down(): void
    {
        Schema::dropIfExists('loom_order_assignments');
    }

    private function backfillFromCurrentFabrics(): void
    {
        $rows = DB::table('fabrics')
            ->whereNotNull('loom_id')
            ->whereNotNull('yarn_order_id')
            ->get(['id', 'loom_id', 'yarn_order_id', 'design', 'weave_technique', 'colour']);

        $now = now();
        foreach ($rows as $r) {
            DB::table('loom_order_assignments')->insert([
                'loom_id' => (int) $r->loom_id,
                'order_id' => (int) $r->yarn_order_id,
                'fabric_id' => (int) $r->id,
                'design' => $r->design,
                'weave_technique' => $r->weave_technique,
                'colour' => $r->colour,
                'start_date' => '2000-01-01',
                'end_date' => null,
                'created_by' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }
};
