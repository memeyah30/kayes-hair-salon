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
        // Delete physical duplicates in the Sale table for the same appointment and item
        // This cleans up the "24 entries" issue where services were duplicated.
        $duplicates = \Illuminate\Support\Facades\DB::table('sales')
            ->select('appointment_id', 'item_name', \Illuminate\Support\Facades\DB::raw('MIN(id) as keep_id'))
            ->whereNotNull('appointment_id')
            ->where('notes', 'Recorded from booking payment/confirmation')
            ->groupBy('appointment_id', 'item_name')
            ->get();

        foreach ($duplicates as $dup) {
            \Illuminate\Support\Facades\DB::table('sales')
                ->where('appointment_id', $dup->appointment_id)
                ->where('item_name', $dup->item_name)
                ->where('notes', 'Recorded from booking payment/confirmation')
                ->where('id', '!=', $dup->keep_id)
                ->delete();
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
