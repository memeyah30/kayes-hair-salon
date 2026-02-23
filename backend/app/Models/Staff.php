<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Staff extends Model
{
    use HasFactory;

    protected $table = 'staff';

    protected $fillable = [
        'user_id',
        'first_name',
        'last_name',
        'email',
        'phone',
        'role',
        'specialization',
        'photo_path',
        'status',
        'created_by_manager_id',
        'approved_by_admin_id',
        'approved_at',
        'rejected_reason',
    ];

    protected $casts = [
        'specialization' => 'array',
        'approved_at' => 'datetime',
    ];

    public function createdByManager()
    {
        return $this->belongsTo(Manager::class, 'created_by_manager_id');
    }

    public function approvedByAdmin()
    {
        return $this->belongsTo(Admin::class, 'approved_by_admin_id');
    }

    public function user()
    {
        return $this->belongsTo(Stylist::class, 'user_id');
    }
}

