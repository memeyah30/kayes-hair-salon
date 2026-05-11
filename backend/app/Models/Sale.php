<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Sale extends Model
{
    use HasFactory;

    protected $fillable = [
        'appointment_id',
        'transaction_type',
        'item_name',
        'quantity',
        'unit_price_cents',
        'total_amount_cents',
        'payment_method',
        'payment_status',
        'customer_name',
        'customer_phone',
        'recorded_at',
        'notes',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_price_cents' => 'integer',
        'total_amount_cents' => 'integer',
        'recorded_at' => 'datetime',
    ];

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

}
