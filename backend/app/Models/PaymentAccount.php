<?php

namespace App\Models;

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
        'is_active',
        'instructions',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}

