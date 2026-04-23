<?php

namespace App\Models;

use App\Support\UploadStorage;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentAccount extends Model
{
    use HasFactory;

    protected $fillable = [
        'account_name',
        'account_number',
        'account_type',
        'bank_name',
        'qr_code_url',
        'qr_code_path',
        'is_active',
        'instructions',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    protected $appends = [
        'qr_code_full_url',
    ];

    public function getQrCodeFullUrlAttribute(): ?string
    {
        if ($this->qr_code_path) {
            return UploadStorage::url($this->getRawOriginal('qr_code_path'));
        }

        if ($this->qr_code_url) {
            return $this->qr_code_url;
        }

        return null;
    }
}
