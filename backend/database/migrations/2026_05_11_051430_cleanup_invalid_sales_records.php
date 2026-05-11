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
        // Delete Sale records that belong to an appointment that is NOT completed
        // This fixes the "inflated revenue" issue caused by older logic that recorded
        // full sales for pending/booked appointments.
        \Illuminate\Support\Facades\DB::table('sales')
            ->whereNotNull('appointment_id')
            ->whereIn('appointment_id', function ($query) {
                $query->select('id')
                    ->from('appointments')
                    ->where('status', '!=', 'completed');
            })
            ->delete();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
