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
        if (!Schema::hasTable('sales')) {
            Schema::create('sales', function (Blueprint $table) {
                $table->id();
                $table->foreignId('appointment_id')->nullable()->constrained()->nullOnDelete(); // Link to appointment if applicable
                $table->foreignId('inventory_id')->nullable()->constrained('inventory')->nullOnDelete(); // Link to inventory item if applicable
                $table->string('transaction_type')->default('service'); // 'service', 'product', 'both'
                $table->string('item_name'); // Name of service or product sold
                $table->integer('quantity')->default(1);
                $table->integer('unit_price_cents');
                $table->integer('total_amount_cents');
                $table->enum('payment_method', ['cash', 'gcash', 'paymaya', 'card', 'other'])->default('cash');
                $table->enum('payment_status', ['pending', 'paid', 'refunded'])->default('paid');
                $table->string('customer_name')->nullable();
                $table->string('customer_phone')->nullable();
                $table->foreignId('stylist_id')->nullable()->constrained()->nullOnDelete(); // Which stylist made the sale
                $table->text('notes')->nullable();
                $table->timestamps();
                
                $table->index('appointment_id');
                $table->index('inventory_id');
                $table->index('stylist_id');
                $table->index('created_at');
                $table->index('transaction_type');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales');
    }
};
