<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceVariant extends Model
{
    use HasFactory;

    protected $fillable = [
        'service_id',
        'name',
        'price_cents',
        'order',
    ];

    protected $casts = [
        'price_cents' => 'integer',
        'duration_minutes' => 'integer',
        'order' => 'integer',
    ];

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }
}
