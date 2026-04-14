<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('stylist_services')) {
            Schema::create('stylist_services', function (Blueprint $table) {
                $table->id();
                $table->foreignId('stylist_id')->constrained('stylists')->cascadeOnDelete();
                $table->foreignId('service_id')->constrained('services')->cascadeOnDelete();
                $table->timestamps();

                $table->unique(['stylist_id', 'service_id'], 'stylist_services_unique');
            });
        }

        if (Schema::hasTable('service_stylist')) {
            $pairs = DB::table('service_stylist')
                ->select('stylist_id', 'service_id')
                ->get()
                ->map(fn ($row) => [
                    'stylist_id' => (int) $row->stylist_id,
                    'service_id' => (int) $row->service_id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
                ->all();

            if (!empty($pairs)) {
                DB::table('stylist_services')->upsert(
                    $pairs,
                    ['stylist_id', 'service_id'],
                    ['updated_at']
                );
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('stylist_services');
    }
};
