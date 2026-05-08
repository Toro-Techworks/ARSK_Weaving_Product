<?php

use App\Models\GenericCode;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $rows = [
            ['Plain', 10],
            ['Twill', 20],
            ['Satin', 30],
            ['Dobby', 40],
            ['Jacquard', 50],
        ];
        foreach ($rows as [$description, $sort]) {
            GenericCode::updateOrCreate(
                ['code_type' => 'weave_technique', 'code_description' => $description],
                ['dropdown_type' => GenericCode::DROPDOWN_TYPE_MASTER, 'sort_order' => $sort, 'is_active' => true]
            );
        }

        $sortNext = 60;
        $existing = DB::table('fabrics')
            ->whereNotNull('weave_technique')
            ->where('weave_technique', '!=', '')
            ->distinct()
            ->pluck('weave_technique');
        foreach ($existing as $raw) {
            $description = trim((string) $raw);
            if ($description === '') {
                continue;
            }
            GenericCode::updateOrCreate(
                ['code_type' => 'weave_technique', 'code_description' => $description],
                [
                    'dropdown_type' => GenericCode::DROPDOWN_TYPE_MASTER,
                    'sort_order' => $sortNext,
                    'is_active' => true,
                ]
            );
            $sortNext += 10;
        }

        GenericCode::forgetCacheForType('weave_technique');
    }

    public function down(): void
    {
        GenericCode::query()->where('code_type', 'weave_technique')->delete();
        GenericCode::forgetCacheForType('weave_technique');
    }
};
