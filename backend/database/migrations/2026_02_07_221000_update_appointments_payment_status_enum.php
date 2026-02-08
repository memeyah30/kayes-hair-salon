<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('appointments')) {
            return;
        }

        // Expand payment_status enum to support manual GCash verification flow
        try {
            DB::statement(
                "ALTER TABLE `appointments` MODIFY COLUMN `payment_status` "
                . "ENUM('unpaid','pending','paid','rejected','downpayment','refunded') "
                . "DEFAULT 'pending'"
            );
        } catch (\Throwable $e) {
            // Ignore if database doesn't support enum modification (e.g., sqlite) or already updated
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('appointments')) {
            return;
        }

        // Revert to original enum values
        try {
            DB::statement(
                "ALTER TABLE `appointments` MODIFY COLUMN `payment_status` "
                . "ENUM('pending','downpayment','paid','refunded') "
                . "DEFAULT 'pending'"
            );
        } catch (\Throwable $e) {
            // Ignore if database doesn't support enum modification
        }
    }
};
