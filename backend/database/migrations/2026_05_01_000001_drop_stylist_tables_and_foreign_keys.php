<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('appointments') && Schema::hasColumn('appointments', 'stylist_id')) {
            Schema::table('appointments', function (Blueprint $table) {
                try {
                    $table->dropForeign(['stylist_id']);
                } catch (\Throwable $e) {
                    // Ignore if the foreign key was already removed.
                }
            });
        }

        if (Schema::hasTable('customer_ratings') && Schema::hasColumn('customer_ratings', 'stylist_id')) {
            Schema::table('customer_ratings', function (Blueprint $table) {
                try {
                    $table->dropForeign(['stylist_id']);
                } catch (\Throwable $e) {
                    // Ignore if the foreign key was already removed.
                }
            });
        }

        if (Schema::hasTable('sales') && Schema::hasColumn('sales', 'stylist_id')) {
            Schema::table('sales', function (Blueprint $table) {
                try {
                    $table->dropForeign(['stylist_id']);
                } catch (\Throwable $e) {
                    // Ignore if the foreign key was already removed.
                }
            });
        }

        if (Schema::hasTable('staff') && Schema::hasColumn('staff', 'user_id')) {
            Schema::table('staff', function (Blueprint $table) {
                try {
                    $table->dropForeign(['user_id']);
                } catch (\Throwable $e) {
                    // Ignore if the foreign key was already removed.
                }
            });
        }

        Schema::dropIfExists('stylist_services');
        Schema::dropIfExists('service_stylist');
        Schema::dropIfExists('stylist_time_offs');
        Schema::dropIfExists('stylist_working_hours');
        Schema::dropIfExists('stylists');
    }

    public function down(): void
    {
        Schema::create('stylists', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->nullable()->unique();
            $table->string('phone')->nullable();
            $table->json('specializations')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });
    }
};
