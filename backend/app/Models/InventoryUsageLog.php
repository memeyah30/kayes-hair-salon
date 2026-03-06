<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryUsageLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'inventory_id',
        'action_type',
        'quantity_changed',
        'reference_type',
        'reference_id',
        'user_id',
        'quantity_before',
        'quantity_after',
        'notes',
    ];

    protected $casts = [
        'quantity_changed' => 'integer',
        'reference_id' => 'integer',
        'user_id' => 'integer',
        'quantity_before' => 'integer',
        'quantity_after' => 'integer',
    ];

    public function inventory(): BelongsTo
    {
        return $this->belongsTo(Inventory::class, 'inventory_id');
    }
}

