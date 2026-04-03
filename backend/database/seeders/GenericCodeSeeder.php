<?php

namespace Database\Seeders;

use App\Models\GenericCode;
use Illuminate\Database\Seeder;

/**
 * Populates generic_codes from previously hardcoded dropdown / validation values.
 * Safe to re-run: uses updateOrCreate on (code_type, code_description).
 */
class GenericCodeSeeder extends Seeder
{
    public function run(): void
    {
        $definitions = [
            ['yarn_receipt_type', 'Cone', 10],
            ['yarn_receipt_type', 'Hank', 20],
            ['active_inactive', 'Active', 10],
            ['active_inactive', 'Inactive', 20],
            ['shift', 'Day', 10],
            ['shift', 'Night', 20],
            ['payment_mode', 'Cash', 10],
            ['payment_mode', 'Bank', 20],
            ['payment_mode', 'UPI', 30],
            ['payment_record_status', 'open', 10],
            ['payment_record_status', 'running', 20],
            ['payment_record_status', 'closed', 30],
            ['expense_category', 'Electricity', 10],
            ['expense_category', 'Labour', 20],
            ['expense_category', 'Maintenance', 30],
            ['expense_category', 'Yarn', 40],
            ['user_status', 'active', 10],
            ['user_status', 'disabled', 20],
            ['menu_link_status', 'active', 10],
            ['menu_link_status', 'inactive', 20],
        ];

        /** Mirrors `roles.role_name`; super_admin is inactive in generic_codes (e.g. hide from assign-role dropdowns). */
        $roleGenericCodes = [
            ['roles', 'super_admin', 10, false],
            ['roles', 'admin', 20, true],
            ['roles', 'user', 30, true],
        ];
        foreach ($roleGenericCodes as [$type, $description, $sort, $isActive]) {
            GenericCode::updateOrCreate(
                ['code_type' => $type, 'code_description' => $description],
                ['dropdown_type' => 'CORE', 'sort_order' => $sort, 'is_active' => $isActive]
            );
        }

        foreach ($definitions as [$type, $description, $sort]) {
            GenericCode::updateOrCreate(
                ['code_type' => $type, 'code_description' => $description],
                ['dropdown_type' => 'CORE', 'sort_order' => $sort, 'is_active' => true]
            );
        }

        $masterRows = [
            ['yarn_colour', 'Red', 10],
            ['yarn_colour', 'Green', 20],
            ['colour', 'Red', 10],
            ['colour', 'Blue', 20],
            ['colour', 'Green', 30],
            ['yarn_receipt_count', '20/10', 10],
            ['yarn_receipt_count', '30/10', 20],
            ['yarn_receipt_content', '20/10', 10],
            ['yarn_receipt_content', '30/10', 20],
        ];
        foreach ($masterRows as [$type, $description, $sort]) {
            GenericCode::updateOrCreate(
                ['code_type' => $type, 'code_description' => $description],
                ['dropdown_type' => GenericCode::DROPDOWN_TYPE_MASTER, 'sort_order' => $sort, 'is_active' => true]
            );
        }

        $typesToClear = array_unique(array_merge(
            array_column($definitions, 0),
            array_column($masterRows, 0),
            array_column($roleGenericCodes, 0)
        ));
        foreach ($typesToClear as $type) {
            GenericCode::forgetCacheForType($type);
        }
    }
}
