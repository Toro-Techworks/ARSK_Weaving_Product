<?php

use App\Models\GenericCode;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')->where('status', 'disabled')->update(['status' => 'inactive']);

        DB::table('generic_codes')
            ->where('code_type', 'user_status')
            ->where('code_description', 'disabled')
            ->update(['is_active' => false]);

        GenericCode::updateOrCreate(
            ['code_type' => 'user_status', 'code_description' => 'inactive'],
            ['dropdown_type' => GenericCode::DROPDOWN_TYPE_CORE, 'sort_order' => 20, 'is_active' => true]
        );
        GenericCode::updateOrCreate(
            ['code_type' => 'user_status', 'code_description' => 'left'],
            ['dropdown_type' => GenericCode::DROPDOWN_TYPE_CORE, 'sort_order' => 30, 'is_active' => true]
        );

        GenericCode::forgetCacheForType('user_status');
    }

    public function down(): void
    {
        DB::table('users')->whereIn('status', ['inactive', 'left'])->update(['status' => 'disabled']);

        GenericCode::query()
            ->where('code_type', 'user_status')
            ->whereIn('code_description', ['inactive', 'left'])
            ->delete();

        DB::table('generic_codes')
            ->where('code_type', 'user_status')
            ->where('code_description', 'disabled')
            ->update(['is_active' => true]);

        GenericCode::forgetCacheForType('user_status');
    }
};
