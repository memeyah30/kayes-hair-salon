<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Inventory extends Model
{
    use HasFactory;

    protected $table = 'inventory';

    protected $fillable = [
        'name',
        'description',
        'category',
        'sku',
        'quantity',
        'min_stock_level',
        'unit_price_cents',
        'selling_price_cents',
        'unit',
        'supplier',
        'expiry_date',
        'is_active',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'min_stock_level' => 'integer',
        'unit_price_cents' => 'integer',
        'selling_price_cents' => 'integer',
        'expiry_date' => 'date',
        'is_active' => 'boolean',
    ];

    public function sales()
    {
        return $this->hasMany(Sale::class);
    }

    public function isLowStock(): bool
    {
        return $this->quantity <= $this->min_stock_level;
    }
}
