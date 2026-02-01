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
        if (!Schema::hasTable('appointment_services')) {
            Schema::create('appointment_services', function (Blueprint $table) {
                $table->id();
                $table->foreignId('appointment_id')->constrained()->cascadeOnDelete();
                $table->foreignId('service_id')->constrained()->cascadeOnDelete();
                $table->timestamps();
                
                // Ensure unique combination
                $table->unique(['appointment_id', 'service_id']);
            });
        } else {
            // Table exists, just ensure it has the right structure
            Schema::table('appointment_services', function (Blueprint $table) {
                if (!Schema::hasColumn('appointment_services', 'appointment_id')) {
                    $table->foreignId('appointment_id')->after('id')->constrained()->cascadeOnDelete();
                }
                if (!Schema::hasColumn('appointment_services', 'service_id')) {
                    $table->foreignId('service_id')->after('appointment_id')->constrained()->cascadeOnDelete();
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('appointment_services');
    }
};
