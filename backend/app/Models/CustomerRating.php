<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerRating extends Model
{
    use HasFactory;

    protected $fillable = [
        'appointment_id',
        'stylist_id',
        'customer_name',
        'customer_email',
        'rating',
        'comment',
    ];

    protected $casts = [
        'rating' => 'integer',
    ];

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function stylist(): BelongsTo
    {
        return $this->belongsTo(Stylist::class);
    }
}

