<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PasswordSetupToken extends Model
{
    use HasFactory;

    public $timestamps = false;

    const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'token',
        'expires_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
