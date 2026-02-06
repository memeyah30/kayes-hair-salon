<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('payment_accounts', function (Blueprint $table) {
            // Add missing columns if they don't exist
            if (!Schema::hasColumn('payment_accounts', 'bank_name')) {
                $table->string('bank_name')->nullable()->after('account_type');
            }
            if (!Schema::hasColumn('payment_accounts', 'qr_code_url')) {
                $table->text('qr_code_url')->nullable()->after('bank_name');
            }
            if (!Schema::hasColumn('payment_accounts', 'instructions')) {
                $table->text('instructions')->nullable()->after('qr_code_url');
            }
            
            // Update account_type to enum if it's not already
            // Note: This might require raw SQL for MySQL
            if (Schema::hasColumn('payment_accounts', 'account_type')) {
                // Check if it's already enum, if not, we'll modify it
                // For safety, we'll use DB::statement if needed
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_accounts', function (Blueprint $table) {
            if (Schema::hasColumn('payment_accounts', 'instructions')) {
                $table->dropColumn('instructions');
            }
            if (Schema::hasColumn('payment_accounts', 'qr_code_url')) {
                $table->dropColumn('qr_code_url');
            }
            if (Schema::hasColumn('payment_accounts', 'bank_name')) {
                $table->dropColumn('bank_name');
            }
        });
    }
};
