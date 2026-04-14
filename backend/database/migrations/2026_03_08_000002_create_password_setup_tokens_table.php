<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('password_setup_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('token', 64)->unique();
            $table->timestamp('expires_at');
            $table->timestamp('created_at')->useCurrent();

            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('password_setup_tokens');
    }
};
