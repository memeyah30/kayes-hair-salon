<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Service extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'image',
        'price_cents',
    ];

    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ServiceVariant::class)->orderBy('order');
    }
}


