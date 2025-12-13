<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NotificationLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'appointment_id',
        'channel',
        'type',
        'status',
        'payload',
    ];

    public function appointment()
    {
        return $this->belongsTo(Appointment::class);
    }
}






