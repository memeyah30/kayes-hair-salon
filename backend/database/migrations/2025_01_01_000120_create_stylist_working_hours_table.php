<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('stylist_working_hours', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stylist_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('weekday'); // 0 = Sunday
            $table->time('start_time');
            $table->time('end_time');
            $table->timestamps();
            $table->unique(['stylist_id', 'weekday', 'start_time', 'end_time'], 'stylist_working_hours_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stylist_working_hours');
    }
};






