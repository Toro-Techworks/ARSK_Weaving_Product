<?php

use App\Models\GenericCode;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('generic_codes')
            ->where('code_type', 'expense_category')
            ->update(['dropdown_type' => GenericCode::DROPDOWN_TYPE_MASTER]);

        GenericCode::forgetCacheForType('expense_category');
    }

    public function down(): void
    {
        DB::table('generic_codes')
            ->where('code_type', 'expense_category')
            ->update(['dropdown_type' => GenericCode::DROPDOWN_TYPE_CORE]);

        GenericCode::forgetCacheForType('expense_category');
    }
};
