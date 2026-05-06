<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Carbon\Carbon;
use DateTimeInterface;

class Appointment extends Model
{
    use HasFactory;

    protected $appends = [
        'start_datetime_pht',
        'end_datetime_pht',
        'rescheduled_at_pht',
        'mode_of_payment',
        'amount_paid_cents',
        'remaining_balance_cents',
    ];

    protected $fillable = [
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
        'rejection_reason',
        'approval_email_sent_at',
        'reminder_sent_at',
    ];

    protected $casts = [
        'start_datetime' => 'datetime',
        'end_datetime' => 'datetime',
        'rescheduled_at' => 'datetime',
        'approval_email_sent_at' => 'datetime',
        'reminder_sent_at' => 'datetime',
        'downpayment_amount_cents' => 'integer',
        'total_amount_cents' => 'integer',
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

    public function getRescheduledAtPhtAttribute()
    {
        $rawRescheduledAt = $this->getRawOriginal('rescheduled_at');
        if (!$rawRescheduledAt) {
            return null;
        }

        return Carbon::createFromFormat('Y-m-d H:i:s', $rawRescheduledAt, 'UTC')
            ->setTimezone('Asia/Manila')
            ->format('Y-m-d\TH:i:sP');
    }

    public function getAmountPaidCentsAttribute(): int
    {
        $totalAmountCents = max(0, (int) ($this->total_amount_cents ?? 0));
        $recordedAmountCents = max(0, (int) ($this->downpayment_amount_cents ?? 0));

        if (strtolower((string) ($this->payment_status ?? '')) === 'paid' && $totalAmountCents > 0) {
            return $totalAmountCents;
        }

        if ($recordedAmountCents > 0) {
            return min($recordedAmountCents, $totalAmountCents ?: $recordedAmountCents);
        }

        return 0;
    }

    public function getRemainingBalanceCentsAttribute(): int
    {
        $totalAmountCents = max(0, (int) ($this->total_amount_cents ?? 0));
        return max(0, $totalAmountCents - $this->amount_paid_cents);
    }

    public function getModeOfPaymentAttribute(): ?string
    {
        $totalAmountCents = max(0, (int) ($this->total_amount_cents ?? 0));
        $amountPaidCents = $this->amount_paid_cents;

        if ($totalAmountCents <= 0 && $amountPaidCents <= 0) {
            return null;
        }

        return $amountPaidCents >= $totalAmountCents ? 'full' : 'downpayment';
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

    public function appointmentRating(): HasOne
    {
        return $this->hasOne(AppointmentRating::class);
    }

    public function appointmentLinks(): HasMany
    {
        return $this->hasMany(AppointmentLink::class);
    }
}
