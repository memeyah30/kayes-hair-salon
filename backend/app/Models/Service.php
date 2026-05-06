<?php

namespace App\Models;

use App\Support\UploadStorage;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Service extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'image',
        'price_cents',
    ];

    protected $appends = [
        'image_url',
    ];

    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ServiceVariant::class)->orderBy('order');
    }

    public function getImageUrlAttribute(): ?string
    {
        return UploadStorage::url($this->getRawOriginal('image'));
    }
}
