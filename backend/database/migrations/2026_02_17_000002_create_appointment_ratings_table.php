<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('appointment_ratings')) {
            return;
        }

        Schema::create('appointment_ratings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('appointment_id')->constrained('appointments')->cascadeOnDelete();
            $table->string('customer_email')->index();
            $table->unsignedTinyInteger('service_rating');
            $table->unsignedTinyInteger('stylist_rating');
            $table->text('comment')->nullable();
            $table->timestamps();

            $table->unique('appointment_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointment_ratings');
    }
};

