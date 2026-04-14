<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('customer_ratings') || !Schema::hasColumn('customer_ratings', 'stylist_id')) {
            return;
        }

        Schema::table('customer_ratings', function (Blueprint $table) {
            // Ratings must still be saved when a completed appointment has no stylist assigned.
            $table->foreignId('stylist_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('customer_ratings') || !Schema::hasColumn('customer_ratings', 'stylist_id')) {
            return;
        }

        Schema::table('customer_ratings', function (Blueprint $table) {
            $table->foreignId('stylist_id')->nullable(false)->change();
        });
    }
};
