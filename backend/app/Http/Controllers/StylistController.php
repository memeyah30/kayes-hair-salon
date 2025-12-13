<?php

namespace App\Http\Controllers;

use App\Models\Service;
use App\Models\Stylist;
use App\Models\StylistWorkingHour;
use App\Services\Scheduler;
use Carbon\Carbon;
use Carbon\CarbonInterval;
use Illuminate\Http\Request;

class StylistController extends Controller
{
    public function index()
    {
        return Stylist::with(['workingHours', 'timeOffs'])->get();
    }

    public function show(Stylist $stylist)
    {
        return $stylist->load(['workingHours', 'timeOffs']);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string',
            'email' => 'nullable|email|unique:stylists,email',
            'phone' => 'nullable|string',
            'password' => 'nullable|string|min:6',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'specializations' => 'nullable|string', // Accept as string, will parse
            'active' => 'nullable', // Will convert to boolean manually
            'working_hours' => 'nullable|string', // Accept as JSON string, will parse
        ]);

        // Parse specializations if it's a JSON string
        if (isset($data['specializations']) && is_string($data['specializations'])) {
            $data['specializations'] = json_decode($data['specializations'], true) ?? [];
        }
        if (empty($data['specializations'])) {
            $data['specializations'] = [];
        }

        // Parse working_hours if it's a JSON string
        if (isset($data['working_hours']) && is_string($data['working_hours'])) {
            $data['working_hours'] = json_decode($data['working_hours'], true) ?? [];
        }
        
        // Validate working_hours array structure
        if (!empty($data['working_hours']) && is_array($data['working_hours'])) {
            foreach ($data['working_hours'] as $wh) {
                if (!isset($wh['weekday']) || !isset($wh['start_time']) || !isset($wh['end_time'])) {
                    return response()->json(['message' => 'Invalid working hours format'], 422);
                }
                if ($wh['weekday'] < 0 || $wh['weekday'] > 6) {
                    return response()->json(['message' => 'Invalid weekday'], 422);
                }
            }
        }

        // Handle boolean - FormData sends strings, convert to boolean
        if (isset($data['active'])) {
            if (is_string($data['active'])) {
                $data['active'] = $data['active'] === 'true' || $data['active'] === '1' || $data['active'] === 'on';
            }
            $data['active'] = (bool) $data['active'];
        } else {
            $data['active'] = true; // Default to active if not provided
        }

        if ($request->hasFile('image')) {
            $image = $request->file('image');
            $imageName = time() . '_' . uniqid() . '.' . $image->getClientOriginalExtension();
            $image->move(public_path('uploads/stylists'), $imageName);
            $data['image'] = 'uploads/stylists/' . $imageName;
        }

        // Set default password if not provided (mutator will hash it)
        if (empty($data['password'])) {
            $data['password'] = 'stylist123';
        }

        $stylist = Stylist::create($data);

        if (!empty($data['working_hours'])) {
            foreach ($data['working_hours'] as $wh) {
                $stylist->workingHours()->create($wh);
            }
        }

        return $stylist->load('workingHours');
    }

    public function update(Request $request, Stylist $stylist)
    {
        $data = $request->validate([
            'name' => 'sometimes|string',
            'email' => 'sometimes|nullable|email|unique:stylists,email,' . $stylist->id,
            'phone' => 'sometimes|nullable|string',
            'password' => 'sometimes|nullable|string|min:6',
            'image' => 'sometimes|nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'specializations' => 'sometimes|nullable|string', // Accept as string, will parse
            'active' => 'sometimes|nullable', // Will convert to boolean manually
            'working_hours' => 'sometimes|nullable|string', // Accept as JSON string, will parse
        ]);

        // Parse specializations if it's a JSON string
        if (isset($data['specializations']) && is_string($data['specializations'])) {
            $data['specializations'] = json_decode($data['specializations'], true) ?? [];
        }

        // Parse working_hours if it's a JSON string
        if (isset($data['working_hours']) && is_string($data['working_hours'])) {
            $data['working_hours'] = json_decode($data['working_hours'], true) ?? [];
        }
        
        // Validate working_hours array structure
        if (isset($data['working_hours']) && !empty($data['working_hours']) && is_array($data['working_hours'])) {
            foreach ($data['working_hours'] as $wh) {
                if (!isset($wh['weekday']) || !isset($wh['start_time']) || !isset($wh['end_time'])) {
                    return response()->json(['message' => 'Invalid working hours format'], 422);
                }
                if ($wh['weekday'] < 0 || $wh['weekday'] > 6) {
                    return response()->json(['message' => 'Invalid weekday'], 422);
                }
            }
        }

        // Handle boolean - FormData sends strings, convert to boolean
        if (isset($data['active'])) {
            if (is_string($data['active'])) {
                $data['active'] = $data['active'] === 'true' || $data['active'] === '1' || $data['active'] === 'on';
            }
            $data['active'] = (bool) $data['active'];
        }

        if ($request->hasFile('image')) {
            // Delete old image if exists
            if ($stylist->image && file_exists(public_path($stylist->image))) {
                unlink(public_path($stylist->image));
            }
            $image = $request->file('image');
            $imageName = time() . '_' . uniqid() . '.' . $image->getClientOriginalExtension();
            $image->move(public_path('uploads/stylists'), $imageName);
            $data['image'] = 'uploads/stylists/' . $imageName;
        }

        // Remove password from update if not provided (mutator will hash if provided)
        if (isset($data['password']) && empty($data['password'])) {
            unset($data['password']);
        }

        $stylist->update($data);

        if (array_key_exists('working_hours', $data)) {
            $stylist->workingHours()->delete();
            foreach ($data['working_hours'] as $wh) {
                $stylist->workingHours()->create($wh);
            }
        }

        return $stylist->load('workingHours');
    }

    public function availability(Request $request, Stylist $stylist, Scheduler $scheduler)
    {
        $data = $request->validate([
            'date' => 'required|date',
            'service_id' => 'nullable|exists:services,id',
            'service_duration' => 'nullable|integer|min:5',
            'step_minutes' => 'nullable|integer|min:5|max:60',
        ]);

        $durationMinutes = $data['service_duration']
            ?? ($data['service_id'] ? Service::find($data['service_id'])->duration_minutes : 30);
        $step = CarbonInterval::minutes($data['step_minutes'] ?? 30); // Changed to 30 minutes

        $freeBlocks = $scheduler->freeBlocksForDate($stylist, $data['date']);
        $slots = [];
        
        // Business hours: 8 AM to 8 PM
        $targetDate = \Carbon\Carbon::parse($data['date'])->startOfDay();
        $businessStart = $targetDate->copy()->setTime(8, 0, 0);
        $businessEnd = $targetDate->copy()->setTime(20, 0, 0);
        
        foreach ($freeBlocks as $block) {
            // Clamp block to business hours
            $blockStart = $block['start']->gt($businessStart) ? $block['start']->copy() : $businessStart->copy();
            $blockEnd = $block['end']->lt($businessEnd) ? $block['end']->copy() : $businessEnd->copy();
            
            if ($blockStart->gte($blockEnd)) {
                continue;
            }
            
            $cursor = $blockStart->copy();
            $latestStart = $blockEnd->copy()->subMinutes($durationMinutes);
            while ($cursor->lte($latestStart)) {
                $slotEnd = $cursor->copy()->addMinutes($durationMinutes);
                // Only add slot if it's within business hours
                if ($slotEnd->lte($businessEnd)) {
                    $slots[] = [
                        'start' => $cursor->copy(),
                        'end' => $slotEnd,
                    ];
                }
                $cursor->add($step);
            }
        }

        return response()->json($slots);
    }

    public function addTimeOff(Request $request, Stylist $stylist)
    {
        $data = $request->validate([
            'start_datetime' => 'required|date',
            'end_datetime' => 'required|date|after:start_datetime',
        ]);

        $timeOff = $stylist->timeOffs()->create($data);
        return $timeOff;
    }

    public function removeTimeOff(Stylist $stylist, $timeOffId)
    {
        $timeOff = $stylist->timeOffs()->findOrFail($timeOffId);
        $timeOff->delete();
        return response()->json(['message' => 'Time off removed']);
    }
}

