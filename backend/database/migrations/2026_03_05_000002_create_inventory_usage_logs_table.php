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
        if (!Schema::hasTable('inventory_usage_logs')) {
            Schema::create('inventory_usage_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('inventory_id')->constrained('inventory')->cascadeOnDelete();
                $table->string('action_type', 50); // stock_added, stock_deducted, used_in_service, manual_adjustment
                $table->integer('quantity_changed'); // positive for add, negative for deduction
                $table->string('reference_type', 50)->nullable(); // service, manual, sale
                $table->unsignedBigInteger('reference_id')->nullable();
                $table->unsignedBigInteger('user_id')->nullable();
                $table->integer('quantity_before')->nullable();
                $table->integer('quantity_after')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->index(['inventory_id', 'created_at']);
                $table->index(['reference_type', 'reference_id']);
                $table->index(['action_type', 'created_at']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_usage_logs');
    }
};

