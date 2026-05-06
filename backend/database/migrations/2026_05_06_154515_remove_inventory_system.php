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
        // 1. Drop foreign key and column from sales table
        Schema::table('sales', function (Blueprint $table) {
            if (Schema::hasColumn('sales', 'inventory_id')) {
                $table->dropForeign(['inventory_id']);
                $table->dropColumn('inventory_id');
            }
        });

        // 2. Drop inventory-related tables
        Schema::dropIfExists('inventory_usage_logs');
        Schema::dropIfExists('service_inventory_requirements');
        Schema::dropIfExists('inventory');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Re-creating these tables in reverse is complex and usually not needed if the user is sure.
        // But for safety, we define a basic structure or just leave it empty if we don't want to support reverse.
    }
};
