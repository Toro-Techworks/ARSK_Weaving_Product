<?php

use App\Models\GenericCode;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $rows = [
            ['FRDS', 10],
            ['check', 20],
            ['DESIGN', 30],
        ];
        foreach ($rows as [$description, $sort]) {
            GenericCode::updateOrCreate(
                ['code_type' => 'design', 'code_description' => $description],
                ['dropdown_type' => GenericCode::DROPDOWN_TYPE_MASTER, 'sort_order' => $sort, 'is_active' => true]
            );
        }
        GenericCode::forgetCacheForType('design');
    }

    public function down(): void
    {
        GenericCode::query()->where('code_type', 'design')->delete();
        GenericCode::forgetCacheForType('design');
    }
};
