<?php

namespace App\Models;

use App\Support\UploadStorage;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Hash;

class Manager extends Authenticatable
{
    use Notifiable;

    protected $fillable = [
        'name',
        'username',
        'password',
        'active',
        'image',
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
    ];

    public function setPasswordAttribute($value)
    {
        if (!empty($value) && !preg_match('/^\$2[ayb]\$.{56}$/', $value)) {
            $this->attributes['password'] = Hash::make($value);
        } else {
            $this->attributes['password'] = $value;
        }
    }

    public function getImageUrlAttribute(): ?string
    {
        return UploadStorage::url($this->getRawOriginal('image'));
    }
}

