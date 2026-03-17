<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add indexes for frequently filtered/sorted columns to improve query performance.
     * Skips FK columns that already have indexes.
     */
    public function up(): void
    {
        $this->addIndex('fabrics', 'yarn_order_id', 'idx_fabrics_yarn_order_id');
        $this->addIndex('yarn_receipts', 'date', 'idx_yarn_receipts_date');
        $this->addIndex('yarn_requirements', 'yarn_order_id', 'idx_yarn_requirements_yarn_order_id');

        $this->addIndex('loom_entries', 'date', 'idx_loom_entries_date');

        $this->addIndex('user_menu_permissions', 'user_id', 'idx_user_menu_permissions_user_id');
        $this->addIndex('user_menu_permissions', 'menu_id', 'idx_user_menu_permissions_menu_id');

        $this->addIndex('payments', 'payment_date', 'idx_payments_payment_date');

        $this->addIndex('expenses', 'category', 'idx_expenses_category');
        $this->addIndex('expenses', 'date', 'idx_expenses_date');

        $this->addIndex('companies', 'company_name', 'idx_companies_company_name');
        $this->addIndex('looms', 'status', 'idx_looms_status');
        $this->addIndex('menus', 'status', 'idx_menus_status');
        $this->addIndex('menus', 'sort_order', 'idx_menus_sort_order');
    }

    private function addIndex(string $table, string $column, string $name): void
    {
        $exists = DB::selectOne("
            SELECT 1 FROM information_schema.statistics
            WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?
        ", [$table, $name]);
        if (!$exists) {
            Schema::table($table, fn (Blueprint $t) => $t->index($column, $name));
        }
    }

    public function down(): void
    {
        $drops = [
            'fabrics' => ['idx_fabrics_yarn_order_id'],
            'yarn_receipts' => ['idx_yarn_receipts_date'],
            'yarn_requirements' => ['idx_yarn_requirements_yarn_order_id'],
            'loom_entries' => ['idx_loom_entries_date'],
            'user_menu_permissions' => ['idx_user_menu_permissions_user_id', 'idx_user_menu_permissions_menu_id'],
            'payments' => ['idx_payments_payment_date'],
            'expenses' => ['idx_expenses_category', 'idx_expenses_date'],
            'companies' => ['idx_companies_company_name'],
            'looms' => ['idx_looms_status'],
            'menus' => ['idx_menus_status', 'idx_menus_sort_order'],
        ];
        foreach ($drops as $table => $indexes) {
            foreach ($indexes as $idx) {
                Schema::table($table, fn (Blueprint $t) => $t->dropIndex($idx));
            }
        }
    }
};
