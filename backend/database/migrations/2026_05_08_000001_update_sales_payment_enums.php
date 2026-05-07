<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite' || !Schema::hasTable('sales')) {
            return;
        }

        try {
            DB::statement(
                "ALTER TABLE `sales` MODIFY COLUMN `payment_method` "
                . "ENUM('cash','gcash','paymaya','card','other') NOT NULL DEFAULT 'cash'"
            );

            DB::statement(
                "ALTER TABLE `sales` MODIFY COLUMN `payment_status` "
                . "ENUM('pending','paid','refunded','partially_paid','downpayment') NOT NULL DEFAULT 'paid'"
            );
        } catch (\Throwable $e) {
            // Ignore if the database does not support enum modification or the schema is already updated.
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite' || !Schema::hasTable('sales')) {
            return;
        }

        try {
            DB::statement(
                "ALTER TABLE `sales` MODIFY COLUMN `payment_method` "
                . "ENUM('cash','gcash','paymaya','card','other') NOT NULL DEFAULT 'cash'"
            );

            DB::statement(
                "ALTER TABLE `sales` MODIFY COLUMN `payment_status` "
                . "ENUM('pending','paid','refunded') NOT NULL DEFAULT 'paid'"
            );
        } catch (\Throwable $e) {
            // Ignore if the database does not support enum modification.
        }
    }
};
