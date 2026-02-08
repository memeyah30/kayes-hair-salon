<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('payment_accounts')) {
            return;
        }

        Schema::table('payment_accounts', function (Blueprint $table) {
            if (!Schema::hasColumn('payment_accounts', 'qr_code_path')) {
                $table->string('qr_code_path')->nullable()->after('qr_code_url');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('payment_accounts')) {
            return;
        }

        Schema::table('payment_accounts', function (Blueprint $table) {
            if (Schema::hasColumn('payment_accounts', 'qr_code_path')) {
                $table->dropColumn('qr_code_path');
            }
        });
    }
};

