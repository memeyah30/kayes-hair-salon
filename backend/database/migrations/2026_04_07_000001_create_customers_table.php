<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('customers')) {
            return;
        }

        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('name')->nullable();
            $table->string('email')->unique();
            $table->string('phone')->nullable();
            $table->string('address')->nullable();
            $table->dateTime('last_verified_at')->nullable();
            $table->timestamps();

            $table->index('phone');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
