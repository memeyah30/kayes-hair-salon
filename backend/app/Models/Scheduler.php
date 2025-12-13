<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Service;
use App\Models\Stylist;
use Carbon\Carbon;
use Carbon\CarbonInterval;
//use Carbon\CarbonPeriod;
use Illuminate\Support\Collection;

class Scheduler
{
    public function findSlot(Stylist $stylist, Service $service, string $date, ?string $preferredTime = null): ?array
    {
        $targetDate = Carbon::parse($date)->startOfDay();
        $workBlocks = $this->getWorkingBlocks($stylist, $targetDate);
        if ($workBlocks->isEmpty()) {
            return null;
        }

        $busyBlocks = $this->getBusyBlocks($stylist, $targetDate);
        $freeBlocks = $this->subtractBusyFromWork($workBlocks, $busyBlocks);

        $duration = CarbonInterval::minutes($service->duration_minutes);
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

    private function getWorkingBlocks(Stylist $stylist, Carbon $date): Collection
    {
        $weekday = $date->dayOfWeek;
        $hours = $stylist->workingHours()->where('weekday', $weekday)->get();

        return $hours->map(function ($h) use ($date) {
            return [
                'start' => $date->copy()->setTimeFromTimeString($h->start_time),
                'end' => $date->copy()->setTimeFromTimeString($h->end_time),
            ];
        });
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
