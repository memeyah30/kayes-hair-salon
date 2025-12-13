<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Laravel\Sanctum\HasApiTokens;

class Stylist extends Model
{
    use HasFactory, HasApiTokens;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'image',
        'specializations',
        'active',
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'specializations' => 'array',
        'active' => 'boolean',
    ];

    public function setPasswordAttribute($value)
    {
        // Only hash if the value is not already hashed
        if (!empty($value) && !preg_match('/^\$2[ayb]\$.{56}$/', $value)) {
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
}


