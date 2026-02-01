<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            // Check if columns exist before adding them
            if (!Schema::hasColumn('appointments', 'customer_address')) {
                $table->string('customer_address')->nullable()->after('customer_phone');
            }
            if (!Schema::hasColumn('appointments', 'payment_method')) {
                $table->enum('payment_method', ['on_hand', 'online'])->nullable()->after('customer_address');
            }
            if (!Schema::hasColumn('appointments', 'payment_status')) {
                $table->enum('payment_status', ['pending', 'downpayment', 'paid', 'refunded'])->default('pending')->after('payment_method');
            }
            if (!Schema::hasColumn('appointments', 'downpayment_amount_cents')) {
                $table->integer('downpayment_amount_cents')->nullable()->after('payment_status');
            }
            if (!Schema::hasColumn('appointments', 'total_amount_cents')) {
                $table->integer('total_amount_cents')->nullable()->after('downpayment_amount_cents');
            }
            if (!Schema::hasColumn('appointments', 'payment_proof_url')) {
                $table->text('payment_proof_url')->nullable()->after('total_amount_cents');
            }
            if (!Schema::hasColumn('appointments', 'rescheduled_at')) {
                $table->dateTime('rescheduled_at')->nullable()->after('end_datetime');
            }
            if (!Schema::hasColumn('appointments', 'rescheduled_by_id')) {
                $table->foreignId('rescheduled_by_id')->nullable()->after('rescheduled_at');
            }
            if (!Schema::hasColumn('appointments', 'rescheduled_by_type')) {
                $table->string('rescheduled_by_type')->nullable()->after('rescheduled_by_id');
            }
            if (!Schema::hasColumn('appointments', 'reschedule_reason')) {
                $table->text('reschedule_reason')->nullable()->after('rescheduled_by_type');
            }
        });
        
        // Update status enum to include 'missed' (only if it doesn't already have 'missed')
        try {
            $currentStatus = \Illuminate\Support\Facades\DB::select("SHOW COLUMNS FROM `appointments` WHERE Field = 'status'");
            if (!empty($currentStatus)) {
                $type = $currentStatus[0]->Type;
                if (strpos($type, 'missed') === false) {
                    \Illuminate\Support\Facades\DB::statement("ALTER TABLE `appointments` MODIFY COLUMN `status` ENUM('booked', 'cancelled', 'completed', 'missed') DEFAULT 'booked'");
                }
            }
        } catch (\Exception $e) {
            // If enum update fails, continue - it might already be updated
        }
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn([
                'customer_address',
                'payment_method',
                'payment_status',
                'downpayment_amount_cents',
                'total_amount_cents',
                'payment_proof_url',
                'rescheduled_at',
                'rescheduled_by_id',
                'rescheduled_by_type',
                'reschedule_reason'
            ]);
        });
        
        // Revert status enum
        \Illuminate\Support\Facades\DB::statement("ALTER TABLE `appointments` MODIFY COLUMN `status` ENUM('booked', 'cancelled', 'completed') DEFAULT 'booked'");
    }
};

