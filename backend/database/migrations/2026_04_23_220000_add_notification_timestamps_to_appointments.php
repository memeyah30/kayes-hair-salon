<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('appointments')) {
            return;
        }

        Schema::table('appointments', function (Blueprint $table) {
            if (!Schema::hasColumn('appointments', 'approval_email_sent_at')) {
                $table->timestamp('approval_email_sent_at')->nullable()->after('reschedule_reason');
            }

            if (!Schema::hasColumn('appointments', 'reminder_sent_at')) {
                $table->timestamp('reminder_sent_at')->nullable()->after('approval_email_sent_at');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('appointments')) {
            return;
        }

        Schema::table('appointments', function (Blueprint $table) {
            if (Schema::hasColumn('appointments', 'reminder_sent_at')) {
                $table->dropColumn('reminder_sent_at');
            }

            if (Schema::hasColumn('appointments', 'approval_email_sent_at')) {
                $table->dropColumn('approval_email_sent_at');
            }
        });
    }
};
