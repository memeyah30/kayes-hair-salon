<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('appointment_ratings')) {
            Schema::table('appointment_ratings', function (Blueprint $table) {
                // Ensure team_rating exists
                if (!Schema::hasColumn('appointment_ratings', 'team_rating')) {
                    $table->unsignedTinyInteger('team_rating')->nullable()->after('service_rating');
                }
            });

            // If stylist_rating still exists, migrate data and drop it
            if (Schema::hasColumn('appointment_ratings', 'stylist_rating')) {
                DB::statement('UPDATE appointment_ratings SET team_rating = stylist_rating WHERE team_rating IS NULL');
                
                Schema::table('appointment_ratings', function (Blueprint $table) {
                    $table->dropColumn('stylist_rating');
                });
            }
            
            // Ensure team_rating is not null if we want to enforce it (optional, but keep nullable for safety if legacy data exists)
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('appointment_ratings')) {
            Schema::table('appointment_ratings', function (Blueprint $table) {
                if (!Schema::hasColumn('appointment_ratings', 'stylist_rating')) {
                    $table->unsignedTinyInteger('stylist_rating')->nullable()->after('service_rating');
                }
            });

            DB::statement('UPDATE appointment_ratings SET stylist_rating = team_rating WHERE stylist_rating IS NULL');

            Schema::table('appointment_ratings', function (Blueprint $table) {
                if (Schema::hasColumn('appointment_ratings', 'team_rating')) {
                    $table->dropColumn('team_rating');
                }
            });
        }
    }
};
