<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Appointment extends Model
{
    use HasFactory;

    protected $fillable = [
        'stylist_id',
        'service_id', // Keep for backward compatibility
        'customer_name',
        'customer_email',
        'customer_phone',
        'customer_address',
        'payment_method',
        'payment_status',
        'downpayment_amount_cents',
        'total_amount_cents',
        'payment_proof_url',
        'start_datetime',
        'end_datetime',
        'status',
        'rescheduled_at',
        'rescheduled_by_id',
        'rescheduled_by_type',
        'reschedule_reason',
    ];

    protected $casts = [
        'start_datetime' => 'datetime',
        'end_datetime' => 'datetime',
        'rescheduled_at' => 'datetime',
    ];

    public function stylist(): BelongsTo
    {
        return $this->belongsTo(Stylist::class);
    }

    // Keep for backward compatibility (single service)
    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    // Many-to-many relationship for multiple services
    public function services(): BelongsToMany
    {
        return $this->belongsToMany(Service::class, 'appointment_services')
            ->withTimestamps();
    }

    public function ratings()
    {
        return $this->hasMany(CustomerRating::class);
    }
}






