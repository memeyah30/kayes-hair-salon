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
        Schema::table('services', function (Blueprint $table) {
            if (Schema::hasColumn('services', 'duration_minutes')) {
                $table->dropColumn('duration_minutes');
            }
        });
        
        // Also remove from service_variants if it exists
        Schema::table('service_variants', function (Blueprint $table) {
            if (Schema::hasColumn('service_variants', 'duration_minutes')) {
                $table->dropColumn('duration_minutes');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            if (!Schema::hasColumn('services', 'duration_minutes')) {
                $table->unsignedInteger('duration_minutes')->default(30)->after('name');
            }
        });
        
        Schema::table('service_variants', function (Blueprint $table) {
            if (!Schema::hasColumn('service_variants', 'duration_minutes')) {
                $table->unsignedInteger('duration_minutes')->nullable()->after('price_cents');
            }
        });
    }
};
