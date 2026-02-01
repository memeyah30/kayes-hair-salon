<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Service;
use App\Models\Stylist;
use Carbon\Carbon;
use Carbon\CarbonInterval;
use Illuminate\Support\Collection;

class Scheduler
{
    public function findSlot(Stylist $stylist, Service $service, string $date, ?string $preferredTime = null): ?array
    {
        return $this->findSlotForServices($stylist, [$service], $date, $preferredTime);
    }

    public function findSlotForServices(Stylist $stylist, array $services, string $date, ?string $preferredTime = null): ?array
    {
        $targetDate = Carbon::parse($date)->startOfDay();
        $freeBlocks = $this->freeBlocksForDate($stylist, $date);
        if ($freeBlocks->isEmpty()) {
            return null;
        }

        // Calculate total duration for all services
        $totalDurationMinutes = 0;
        foreach ($services as $service) {
            $totalDurationMinutes += $service->duration_minutes;
        }
        $duration = CarbonInterval::minutes($totalDurationMinutes);
        
        $preferred = $preferredTime ? $targetDate->copy()->setTimeFromTimeString($preferredTime) : null;

        foreach ($freeBlocks as $block) {
            $start = $preferred && $preferred->betweenIncluded($block['start'], $block['end'])
                ? $preferred->copy()
                : $block['start']->copy();

            if ($start->lt($block['start'])) {
                $start = $block['start']->copy();
            }

            $end = $start->copy()->add($duration);
            if ($end->lte($block['end'])) {
                return ['start' => $start, 'end' => $end];
            }

            // try from block start if preferred overshoots
            $start = $block['start']->copy();
            $end = $start->copy()->add($duration);
            if ($end->lte($block['end'])) {
                return ['start' => $start, 'end' => $end];
            }
        }

        return null;
    }

    public function freeBlocksForDate(Stylist $stylist, string $date): Collection
    {
        $targetDate = Carbon::parse($date)->startOfDay();
        $workBlocks = $this->getWorkingBlocks($stylist, $targetDate);
        if ($workBlocks->isEmpty()) {
            return collect();
        }

        $busyBlocks = $this->getBusyBlocks($stylist, $targetDate);
        return $this->subtractBusyFromWork($workBlocks, $busyBlocks);
    }

    private function getWorkingBlocks(Stylist $stylist, Carbon $date): Collection
    {
        // ENFORCE: Monday to Sunday, 8 AM to 8 PM only
        // All days are available with fixed business hours
        $businessStart = $date->copy()->setTime(8, 0, 0);
        $businessEnd = $date->copy()->setTime(20, 0, 0);

        // Return single block for 8 AM to 8 PM regardless of stylist working hours
        return collect([
            [
                'start' => $businessStart,
                'end' => $businessEnd,
            ]
        ]);
    }

    private function getBusyBlocks(Stylist $stylist, Carbon $date): Collection
    {
        $start = $date->copy()->startOfDay();
        $end = $date->copy()->endOfDay();

        $appointments = Appointment::where('stylist_id', $stylist->id)
            ->where('status', 'booked')
            ->whereBetween('start_datetime', [$start, $end])
            ->get()
            ->map(fn ($a) => ['start' => $a->start_datetime, 'end' => $a->end_datetime]);

        $timeOffs = $stylist->timeOffs()
            ->where(function ($q) use ($start, $end) {
                $q->whereBetween('start_datetime', [$start, $end])
                    ->orWhereBetween('end_datetime', [$start, $end]);
            })
            ->get()
            ->map(fn ($t) => ['start' => $t->start_datetime, 'end' => $t->end_datetime]);

        return $appointments->merge($timeOffs);
    }

    private function subtractBusyFromWork(Collection $workBlocks, Collection $busyBlocks): Collection
    {
        $free = collect();
        foreach ($workBlocks as $block) {
            $currentStart = $block['start']->copy();
            $currentEnd = $block['end']->copy();

            $overlaps = $busyBlocks->filter(function ($busy) use ($currentStart, $currentEnd) {
                return $busy['start']->lt($currentEnd) && $busy['end']->gt($currentStart);
            })->sortBy('start');

            if ($overlaps->isEmpty()) {
                $free->push(['start' => $currentStart, 'end' => $currentEnd]);
                continue;
            }

            foreach ($overlaps as $busy) {
                if ($busy['start']->gt($currentStart)) {
                    $free->push(['start' => $currentStart->copy(), 'end' => $busy['start']->copy()]);
                }
                $currentStart = $busy['end']->copy();
            }

            if ($currentStart->lt($currentEnd)) {
                $free->push(['start' => $currentStart, 'end' => $currentEnd]);
            }
        }

        return $free->filter(fn ($b) => $b['end']->gt($b['start']))->values();
    }
}

