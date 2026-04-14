<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('customer_otps') || Schema::hasColumn('customer_otps', 'purpose')) {
            return;
        }

        Schema::table('customer_otps', function (Blueprint $table) {
            $table->string('purpose', 50)->default('manage_booking')->after('email');
            $table->index(['email', 'purpose', 'created_at'], 'customer_otps_email_purpose_created_idx');
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('customer_otps') || !Schema::hasColumn('customer_otps', 'purpose')) {
            return;
        }

        Schema::table('customer_otps', function (Blueprint $table) {
            $table->dropIndex('customer_otps_email_purpose_created_idx');
            $table->dropColumn('purpose');
        });
    }
};
