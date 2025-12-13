<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stylist_id')->constrained()->cascadeOnDelete();
            $table->foreignId('service_id')->constrained()->cascadeOnDelete();
            $table->string('customer_name');
            $table->string('customer_email')->nullable();
            $table->string('customer_phone')->nullable();
            $table->dateTime('start_datetime');
            $table->dateTime('end_datetime');
            $table->enum('status', ['booked', 'cancelled', 'completed'])->default('booked');
            $table->timestamps();
            $table->index(['stylist_id', 'start_datetime', 'end_datetime'], 'appointments_stylist_time_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};







