<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Appointment extends Model
{
    use HasFactory;

    protected $fillable = [
        'stylist_id',
        'service_id',
        'customer_name',
        'customer_email',
        'customer_phone',
        'start_datetime',
        'end_datetime',
        'status',
    ];

    protected $casts = [
        'start_datetime' => 'datetime',
        'end_datetime' => 'datetime',
    ];

    public function stylist(): BelongsTo
    {
        return $this->belongsTo(Stylist::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }
}






