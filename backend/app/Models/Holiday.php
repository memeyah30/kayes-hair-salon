<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Holiday extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'date',
        'type',
        'is_closed',
        'description',
        'recurring_yearly',
    ];

    protected $casts = [
        'date' => 'date',
        'is_closed' => 'boolean',
        'recurring_yearly' => 'boolean',
    ];
}

