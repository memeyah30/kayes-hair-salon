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
        if (!Schema::hasTable('inventory')) {
            Schema::create('inventory', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->text('description')->nullable();
                $table->string('category')->nullable(); // e.g., 'hair_products', 'tools', 'supplies'
                $table->string('sku')->unique()->nullable(); // Stock Keeping Unit
                $table->integer('quantity')->default(0);
                $table->integer('min_stock_level')->default(0); // Alert when below this
                $table->integer('unit_price_cents')->default(0); // Cost per unit
                $table->integer('selling_price_cents')->default(0); // Selling price per unit
                $table->string('unit')->default('piece'); // piece, bottle, box, etc.
                $table->string('supplier')->nullable();
                $table->date('expiry_date')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
                
                $table->index('category');
                $table->index('sku');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory');
    }
};
