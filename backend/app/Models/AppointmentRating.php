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
        'team_rating',
        'comment',
    ];

    protected $casts = [
        'service_rating' => 'integer',
        'team_rating' => 'integer',
    ];

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }
}
