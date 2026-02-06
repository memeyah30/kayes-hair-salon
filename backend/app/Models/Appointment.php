<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Carbon\Carbon;
use DateTimeInterface;

class Appointment extends Model
{
    use HasFactory;

    protected $appends = [
        'start_datetime_pht',
        'end_datetime_pht',
    ];

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

    protected function serializeDate(DateTimeInterface $date)
    {
        return Carbon::instance($date)
            ->setTimezone('Asia/Manila')
            ->format('Y-m-d\TH:i:sP');
    }

    public function getStartDatetimePhtAttribute()
    {
        $rawStart = $this->getRawOriginal('start_datetime');
        if (!$rawStart) {
            return null;
        }
        return Carbon::createFromFormat('Y-m-d H:i:s', $rawStart, 'UTC')
            ->setTimezone('Asia/Manila')
            ->format('Y-m-d\TH:i:sP');
    }

    public function getEndDatetimePhtAttribute()
    {
        $rawEnd = $this->getRawOriginal('end_datetime');
        if (!$rawEnd) {
            return null;
        }
        return Carbon::createFromFormat('Y-m-d H:i:s', $rawEnd, 'UTC')
            ->setTimezone('Asia/Manila')
            ->format('Y-m-d\TH:i:sP');
    }

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
            ->withPivot('service_variant_id')
            ->withTimestamps();
    }

    public function ratings()
    {
        return $this->hasMany(CustomerRating::class);
    }
}




