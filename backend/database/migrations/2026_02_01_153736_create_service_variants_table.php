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
        if (!Schema::hasTable('service_variants')) {
            Schema::create('service_variants', function (Blueprint $table) {
                $table->id();
                $table->foreignId('service_id')->constrained()->cascadeOnDelete();
                $table->string('name'); // e.g., "For Women", "For Men", "Short Hair", "Long Hair"
                $table->unsignedInteger('price_cents');
                $table->unsignedInteger('duration_minutes')->nullable(); // Optional, can inherit from service
                $table->integer('order')->default(0); // For sorting variants
                $table->timestamps();
                
                $table->index('service_id');
                $table->index('order');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('service_variants');
    }
};
