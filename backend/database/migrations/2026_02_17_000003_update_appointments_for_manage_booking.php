<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('appointments')) {
            return;
        }

        if (Schema::hasColumn('appointments', 'customer_email')) {
            try {
                Schema::table('appointments', function (Blueprint $table) {
                    $table->index('customer_email', 'appointments_customer_email_idx');
                });
            } catch (\Throwable $e) {
                // Ignore if index already exists or database engine behaves differently.
            }
        }

        // Keep backward compatibility with existing statuses while supporting manage-booking flow.
        try {
            DB::statement(
                "ALTER TABLE `appointments` MODIFY COLUMN `status` "
                . "ENUM('booked','pending','confirmed','completed','cancelled','missed') "
                . "DEFAULT 'booked'"
            );
        } catch (\Throwable $e) {
            // Ignore if database does not support enum updates in this environment.
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('appointments')) {
            return;
        }

        try {
            Schema::table('appointments', function (Blueprint $table) {
                $table->dropIndex('appointments_customer_email_idx');
            });
        } catch (\Throwable $e) {
            // Ignore if index does not exist.
        }

        try {
            DB::statement(
                "ALTER TABLE `appointments` MODIFY COLUMN `status` "
                . "ENUM('booked','cancelled','completed','missed') "
                . "DEFAULT 'booked'"
            );
        } catch (\Throwable $e) {
            // Ignore if database does not support enum updates.
        }
    }
};

