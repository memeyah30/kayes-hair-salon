<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppointmentRating extends Model
{
    use HasFactory;

    protected $fillable = [
        'appointment_id',
        'customer_email',
        'service_rating',
        'stylist_rating',
        'comment',
    ];

    protected $casts = [
        'service_rating' => 'integer',
        'stylist_rating' => 'integer',
    ];

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }
}

