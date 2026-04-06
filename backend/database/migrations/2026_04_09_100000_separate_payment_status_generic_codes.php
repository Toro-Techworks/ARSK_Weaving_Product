<?php

use App\Models\GenericCode;
use Illuminate\Database\Migrations\Migration;

/**
 * Payment workflow statuses (open / running / closed) must use code_type `payment_status` only.
 * Removes the same values from `active_inactive` if they were added by mistake (weaver / loom UIs
 * would then show the same options as the payment form). Retires `payment_record_status`.
 */
return new class extends Migration
{
    public function up(): void
    {
        foreach ([
            ['payment_status', 'open', 10],
            ['payment_status', 'running', 20],
            ['payment_status', 'closed', 30],
        ] as [$type, $description, $sort]) {
            GenericCode::updateOrCreate(
                ['code_type' => $type, 'code_description' => $description],
                [
                    'dropdown_type' => GenericCode::DROPDOWN_TYPE_CORE,
                    'sort_order' => $sort,
                    'is_active' => true,
                ]
            );
        }

        GenericCode::query()
            ->where('code_type', 'active_inactive')
            ->whereIn('code_description', ['open', 'running', 'closed'])
            ->delete();

        GenericCode::query()->where('code_type', 'payment_record_status')->delete();

        foreach (['payment_status', 'payment_record_status', 'active_inactive'] as $t) {
            GenericCode::forgetCacheForType($t);
        }
    }

    public function down(): void
    {
        foreach ([
            ['payment_record_status', 'open', 10],
            ['payment_record_status', 'running', 20],
            ['payment_record_status', 'closed', 30],
        ] as [$type, $description, $sort]) {
            GenericCode::updateOrCreate(
                ['code_type' => $type, 'code_description' => $description],
                [
                    'dropdown_type' => GenericCode::DROPDOWN_TYPE_CORE,
                    'sort_order' => $sort,
                    'is_active' => true,
                ]
            );
        }

        GenericCode::query()->where('code_type', 'payment_status')->delete();

        foreach (['payment_status', 'payment_record_status', 'active_inactive'] as $t) {
            GenericCode::forgetCacheForType($t);
        }
    }
};
