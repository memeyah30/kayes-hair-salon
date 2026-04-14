<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

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

    public static function findClosedForDate($date): ?self
    {
        $normalizedDate = $date instanceof Carbon
            ? $date->copy()->startOfDay()
            : Carbon::parse($date)->startOfDay();

        $exactHoliday = static::query()
            ->whereDate('date', $normalizedDate->format('Y-m-d'))
            ->where('is_closed', true)
            ->orderBy('date')
            ->first();

        if ($exactHoliday) {
            return $exactHoliday;
        }

        if (!Schema::hasColumn('holidays', 'recurring_yearly')) {
            return null;
        }

        return static::query()
            ->where('is_closed', true)
            ->where('recurring_yearly', true)
            ->whereMonth('date', $normalizedDate->month)
            ->whereDay('date', $normalizedDate->day)
            ->orderBy('date')
            ->first();
    }
}

