<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

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

    protected $appends = [
        'stock_status',
    ];

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }

    public function usageLogs(): HasMany
    {
        return $this->hasMany(InventoryUsageLog::class, 'inventory_id');
    }

    public function serviceRequirements(): HasMany
    {
        return $this->hasMany(ServiceInventoryRequirement::class, 'inventory_id');
    }

    public function isLowStock(): bool
    {
        return $this->quantity <= $this->min_stock_level;
    }

    public function getStockStatusAttribute(): string
    {
        if ((int) $this->quantity <= 0) {
            return 'OUT OF STOCK';
        }

        if ($this->isLowStock()) {
            return 'LOW STOCK';
        }

        return 'IN STOCK';
    }

    public function scopeLowStock($query)
    {
        return $query->whereColumn('quantity', '<=', 'min_stock_level');
    }
}
