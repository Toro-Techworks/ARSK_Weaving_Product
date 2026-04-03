<?php

/**
 * Activity audit: Eloquent models → module keys, plus singular display names for descriptions.
 *
 * user_id on activity_logs = actor (who performed the action).
 * record_id = primary key of the affected row in that module (when applicable).
 */
return [

    'models' => [
        \App\Models\Company::class => 'companies',
        \App\Models\WeavingUnit::class => 'weaving_units',
        \App\Models\Weaver::class => 'weavers',
        \App\Models\Loom::class => 'looms',
        \App\Models\LoomEntry::class => 'loom_entries',
        \App\Models\Payment::class => 'payments',
        \App\Models\Expense::class => 'expenses',
        \App\Models\YarnOrder::class => 'orders',
        \App\Models\YarnReceipt::class => 'yarn_receipts',
        \App\Models\YarnRequirement::class => 'yarn_requirements',
        \App\Models\Fabric::class => 'fabrics',
        \App\Models\GenericCode::class => 'generic_codes',
        \App\Models\Menu::class => 'menus',
    ],

    /**
     * Singular labels used in descriptions (e.g. "Order #12 was updated").
     * Keys must match `models` values above (plus any manual module keys e.g. permissions).
     */
    'display_names' => [
        'companies' => 'Company',
        'weaving_units' => 'Weaving unit',
        'weavers' => 'Weaver',
        'looms' => 'Loom',
        'loom_entries' => 'Loom entry',
        'payments' => 'Payment',
        'expenses' => 'Expense',
        'orders' => 'Order',
        'yarn_receipts' => 'Yarn receipt',
        'yarn_requirements' => 'Yarn requirement',
        'fabrics' => 'Fabric',
        'users' => 'User',
        'generic_codes' => 'Generic code',
        'menus' => 'Menu',
        'permissions' => 'Permissions',
        'system' => 'System',
    ],

];
