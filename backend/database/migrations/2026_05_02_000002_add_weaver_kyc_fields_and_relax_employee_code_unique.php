<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('weavers')) {
            return;
        }

        Schema::table('weavers', function (Blueprint $table) {
            if (! Schema::hasColumn('weavers', 'account_number')) {
                $table->string('account_number', 64)->nullable()->after('status');
            }
            if (! Schema::hasColumn('weavers', 'aadhar_number')) {
                $table->string('aadhar_number', 20)->nullable()->after('account_number');
            }
            if (! Schema::hasColumn('weavers', 'pan_number')) {
                $table->string('pan_number', 20)->nullable()->after('aadhar_number');
            }
            if (! Schema::hasColumn('weavers', 'aadhar_document_path')) {
                $table->string('aadhar_document_path', 512)->nullable()->after('pan_number');
            }
            if (! Schema::hasColumn('weavers', 'pan_document_path')) {
                $table->string('pan_document_path', 512)->nullable()->after('aadhar_document_path');
            }
        });

        try {
            Schema::table('weavers', function (Blueprint $table) {
                $table->dropUnique(['employee_code']);
            });
        } catch (\Throwable) {
            // Index may already be dropped or named differently.
        }

        try {
            Schema::table('weavers', function (Blueprint $table) {
                $table->index('employee_code');
            });
        } catch (\Throwable) {
            // Index may already exist.
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('weavers')) {
            return;
        }

        Schema::table('weavers', function (Blueprint $table) {
            if (Schema::hasColumn('weavers', 'pan_document_path')) {
                $table->dropColumn('pan_document_path');
            }
            if (Schema::hasColumn('weavers', 'aadhar_document_path')) {
                $table->dropColumn('aadhar_document_path');
            }
            if (Schema::hasColumn('weavers', 'pan_number')) {
                $table->dropColumn('pan_number');
            }
            if (Schema::hasColumn('weavers', 'aadhar_number')) {
                $table->dropColumn('aadhar_number');
            }
            if (Schema::hasColumn('weavers', 'account_number')) {
                $table->dropColumn('account_number');
            }
        });

        try {
            Schema::table('weavers', function (Blueprint $table) {
                $table->dropIndex(['employee_code']);
            });
        } catch (\Throwable) {
        }

        try {
            Schema::table('weavers', function (Blueprint $table) {
                $table->unique('employee_code');
            });
        } catch (\Throwable) {
        }
    }
};
