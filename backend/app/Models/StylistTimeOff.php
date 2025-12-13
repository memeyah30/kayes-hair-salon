<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StylistTimeOff extends Model
{
    use HasFactory;

    protected $fillable = [
        'stylist_id',
        'start_datetime',
        'end_datetime',
        'reason',
    ];

    protected $casts = [
        'start_datetime' => 'datetime',
        'end_datetime' => 'datetime',
    ];

    public function stylist()
    {
        return $this->belongsTo(Stylist::class);
    }
}






