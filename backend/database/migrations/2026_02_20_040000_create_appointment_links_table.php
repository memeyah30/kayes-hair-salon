<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointment_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('appointment_id')->constrained()->cascadeOnDelete();
            $table->string('token_hash', 64)->unique();
            $table->dateTime('expires_at');
            $table->dateTime('used_at')->nullable();
            $table->string('purpose')->default('manage');
            $table->timestamps();

            $table->index(['appointment_id', 'purpose'], 'appointment_links_appointment_purpose_idx');
            $table->index(['purpose', 'expires_at'], 'appointment_links_purpose_expires_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointment_links');
    }
};

