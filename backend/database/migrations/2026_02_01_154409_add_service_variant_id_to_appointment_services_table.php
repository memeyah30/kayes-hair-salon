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
        Schema::table('appointment_services', function (Blueprint $table) {
            if (!Schema::hasColumn('appointment_services', 'service_variant_id')) {
                $table->foreignId('service_variant_id')->nullable()->after('service_id')->constrained('service_variants')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointment_services', function (Blueprint $table) {
            if (Schema::hasColumn('appointment_services', 'service_variant_id')) {
                $table->dropForeign(['service_variant_id']);
                $table->dropColumn('service_variant_id');
            }
        });
    }
};
