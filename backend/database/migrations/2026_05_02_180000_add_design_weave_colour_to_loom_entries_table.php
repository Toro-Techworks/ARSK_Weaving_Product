<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('loom_entries')) {
            return;
        }
        Schema::table('loom_entries', function (Blueprint $table) {
            if (! Schema::hasColumn('loom_entries', 'design')) {
                $table->string('design', 255)->nullable()->after('fabric_id');
            }
            if (! Schema::hasColumn('loom_entries', 'weave_technique')) {
                $table->string('weave_technique', 255)->nullable()->after('design');
            }
            if (! Schema::hasColumn('loom_entries', 'colour')) {
                $table->string('colour', 512)->nullable()->after('weave_technique');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('loom_entries')) {
            return;
        }
        Schema::table('loom_entries', function (Blueprint $table) {
            if (Schema::hasColumn('loom_entries', 'colour')) {
                $table->dropColumn('colour');
            }
            if (Schema::hasColumn('loom_entries', 'weave_technique')) {
                $table->dropColumn('weave_technique');
            }
            if (Schema::hasColumn('loom_entries', 'design')) {
                $table->dropColumn('design');
            }
        });
    }
};
