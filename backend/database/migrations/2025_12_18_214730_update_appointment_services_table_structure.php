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
        // Ensure appointment_services table has correct structure
        if (Schema::hasTable('appointment_services')) {
            Schema::table('appointment_services', function (Blueprint $table) {
                // Check and add columns if missing
                if (!Schema::hasColumn('appointment_services', 'appointment_id')) {
                    $table->foreignId('appointment_id')->after('id')->constrained()->cascadeOnDelete();
                }
                if (!Schema::hasColumn('appointment_services', 'service_id')) {
                    $table->foreignId('service_id')->after('appointment_id')->constrained()->cascadeOnDelete();
                }
            });
            
            // Add unique constraint if missing
            try {
                Schema::table('appointment_services', function (Blueprint $table) {
                    $table->unique(['appointment_id', 'service_id'], 'appointment_services_unique');
                });
            } catch (\Exception $e) {
                // Constraint might already exist, ignore
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
