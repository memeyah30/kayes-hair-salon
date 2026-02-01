<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('holidays')) {
            Schema::create('holidays', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->date('date');
                $table->enum('type', ['holiday', 'occasion', 'closed'])->default('holiday');
                $table->boolean('is_closed')->default(true);
                $table->text('description')->nullable();
                $table->boolean('recurring_yearly')->default(false);
                $table->timestamps();
                
                $table->unique(['date', 'type']);
                $table->index('date');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('holidays');
    }
};

