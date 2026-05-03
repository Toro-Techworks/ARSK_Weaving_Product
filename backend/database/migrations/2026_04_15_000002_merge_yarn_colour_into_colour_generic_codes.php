<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function () {
            $yarn = DB::table('generic_codes')
                ->where('code_type', 'yarn_colour')
                ->get(['id', 'code_description', 'sort_order', 'dropdown_type', 'is_active']);

            foreach ($yarn as $row) {
                $existing = DB::table('generic_codes')
                    ->where('code_type', 'colour')
                    ->where('code_description', $row->code_description)
                    ->first(['id', 'sort_order', 'dropdown_type', 'is_active']);

                if ($existing) {
                    // Prefer MASTER dropdown_type if either is MASTER; keep active if any is active; keep smallest sort_order.
                    $nextDropdown = ($existing->dropdown_type === 'MASTER' || $row->dropdown_type === 'MASTER') ? 'MASTER' : $existing->dropdown_type;
                    $nextActive = (bool) $existing->is_active || (bool) $row->is_active;
                    $nextSort = min((int) ($existing->sort_order ?? 0), (int) ($row->sort_order ?? 0));
                    DB::table('generic_codes')->where('id', $existing->id)->update([
                        'dropdown_type' => $nextDropdown,
                        'is_active' => $nextActive,
                        'sort_order' => $nextSort,
                        'updated_at' => now(),
                    ]);
                } else {
                    DB::table('generic_codes')->insert([
                        'code_type' => 'colour',
                        'code_description' => $row->code_description,
                        'sort_order' => (int) ($row->sort_order ?? 0),
                        'dropdown_type' => $row->dropdown_type,
                        'is_active' => (bool) $row->is_active,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            DB::table('generic_codes')->where('code_type', 'yarn_colour')->delete();
        });
    }

    public function down(): void
    {
        // No-op: we intentionally consolidate to a single colour type.
    }
};

