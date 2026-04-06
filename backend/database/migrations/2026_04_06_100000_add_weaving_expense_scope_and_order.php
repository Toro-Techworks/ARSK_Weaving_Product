<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE expenses MODIFY category VARCHAR(255) NOT NULL');
        }

        Schema::table('expenses', function (Blueprint $table) {
            $table->string('expense_scope', 32)->default('textile')->after('id');
            $table->foreignId('yarn_order_id')->nullable()->after('category')->constrained('yarn_orders')->nullOnDelete();
        });

        Schema::table('expenses', function (Blueprint $table) {
            $table->index('expense_scope', 'idx_expenses_expense_scope');
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropIndex('idx_expenses_expense_scope');
        });

        Schema::table('expenses', function (Blueprint $table) {
            $table->dropConstrainedForeignId('yarn_order_id');
            $table->dropColumn('expense_scope');
        });

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE expenses MODIFY category ENUM('Electricity','Labour','Maintenance','Yarn') NOT NULL");
        }
    }
};
