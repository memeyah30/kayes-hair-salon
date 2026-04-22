<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Notification extends Model
{
    protected $fillable = [
        'recipient_type',
        'recipient_id',
        'appointment_id',
        'title',
        'message',
        'is_read',
    ];

    protected $casts = [
        'is_read' => 'boolean',
    ];

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function recipient(): MorphTo
    {
        return $this->morphTo();
    }

    public function scopeForRecipient(Builder $query, $recipient): Builder
    {
        return $query
            ->where('recipient_type', get_class($recipient))
            ->where('recipient_id', $recipient->getKey());
    }
}
