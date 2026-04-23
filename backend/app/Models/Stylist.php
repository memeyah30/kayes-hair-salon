<?php

namespace App\Models;

use App\Support\PasswordHash;
use App\Support\UploadStorage;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class Stylist extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'image',
        'active',
        'role',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $appends = [
        'image_url',
    ];

    protected $casts = [
        'active' => 'boolean',
        'specializations' => 'array',
    ];

    public function setPasswordAttribute($value)
    {
        if (!empty($value) && !PasswordHash::isHashed($value)) {
            $this->attributes['password'] = \Illuminate\Support\Facades\Hash::make($value);
        } else {
            $this->attributes['password'] = $value;
        }
    }

    public function workingHours()
    {
        return $this->hasMany(StylistWorkingHour::class);
    }

    public function timeOffs()
    {
        return $this->hasMany(StylistTimeOff::class);
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }

    public function ratings()
    {
        return $this->hasMany(CustomerRating::class);
    }

    public function services(): BelongsToMany
    {
        return $this->belongsToMany(Service::class, 'stylist_services', 'stylist_id', 'service_id')
            ->withTimestamps();
    }

    public function specializedServices(): BelongsToMany
    {
        return $this->services();
    }

    public function getImageUrlAttribute(): ?string
    {
        return UploadStorage::url($this->getRawOriginal('image'));
    }
}
