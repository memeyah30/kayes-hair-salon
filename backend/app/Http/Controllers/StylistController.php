<?php

namespace App\Http\Controllers;

use App\Models\Service;
use App\Models\Stylist;
use App\Models\StylistWorkingHour;
use App\Services\Scheduler;
use App\Support\UploadStorage;
use Carbon\Carbon;
use Carbon\CarbonInterval;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class StylistController extends Controller
{
    public function index()
    {
        $stylists = Stylist::with(['workingHours', 'timeOffs', 'specializedServices:id,name'])->get();
        return $stylists->map(fn (Stylist $stylist) => $this->appendSpecializationPayload($stylist))->values();
    }

    public function show(Stylist $stylist)
    {
        return $this->appendSpecializationPayload($stylist->load(['workingHours', 'timeOffs', 'specializedServices:id,name']));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string',
            'email' => 'nullable|email|unique:stylists,email',
            'phone' => 'nullable|string',
            'password' => 'nullable|string|min:6',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'active' => 'nullable', // Will convert to boolean manually
            'working_hours' => 'nullable|string', // Accept as JSON string, will parse
            'specialization_ids' => 'nullable',
        ]);

        $specializationIds = $this->parseSpecializationIds($request);
        if (!$this->areServiceIdsValid($specializationIds)) {
            return response()->json(['message' => 'One or more specialization services are invalid.'], 422);
        }
        unset($data['specialization_ids']);

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
            $data['image'] = UploadStorage::store($request->file('image'), 'uploads/stylists');
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

        $this->syncSpecializations($stylist, $specializationIds);

        return $this->appendSpecializationPayload(
            $stylist->load(['workingHours', 'timeOffs', 'specializedServices:id,name'])
        );
    }

    public function update(Request $request, Stylist $stylist)
    {
        $data = $request->validate([
            'name' => 'sometimes|string',
            'email' => 'sometimes|nullable|email|unique:stylists,email,' . $stylist->id,
            'phone' => 'sometimes|nullable|string',
            'password' => 'sometimes|nullable|string|min:6',
            'image' => 'sometimes|nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'active' => 'sometimes|nullable', // Will convert to boolean manually
            'working_hours' => 'sometimes|nullable|string', // Accept as JSON string, will parse
            'specialization_ids' => 'nullable',
        ]);

        $specializationIds = $this->parseSpecializationIds($request);
        if (!$this->areServiceIdsValid($specializationIds)) {
            return response()->json(['message' => 'One or more specialization services are invalid.'], 422);
        }
        unset($data['specialization_ids']);

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
            UploadStorage::delete($stylist->getRawOriginal('image'));
            $data['image'] = UploadStorage::store($request->file('image'), 'uploads/stylists');
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

        if ($request->has('specialization_ids')) {
            $this->syncSpecializations($stylist, $specializationIds);
        }

        // Return fresh instance with all relationships loaded
        return $this->appendSpecializationPayload(
            $stylist->fresh()->load(['workingHours', 'timeOffs', 'specializedServices:id,name'])
        );
    }

    public function availability(Request $request, Stylist $stylist, Scheduler $scheduler)
    {
        $data = $request->validate([
            'date' => 'required|date',
            'service_id' => 'nullable|exists:services,id',
            'service_duration' => 'nullable|integer|min:5',
            'step_minutes' => 'nullable|integer|min:5|max:60',
        ]);

        // Use default duration of 30 minutes (since duration is removed from services)
        $durationMinutes = $data['service_duration'] ?? 30;
        $stepMinutes = $data['step_minutes'] ?? 30; // Fixed interval for slots (30 minutes)
        $step = CarbonInterval::minutes($stepMinutes);

        // Get free blocks to determine availability
        $freeBlocks = $scheduler->freeBlocksForDate($stylist, $data['date']);
        
        // Business hours: Fixed 8 AM to 8 PM (Asia/Manila timezone)
        $timezone = 'Asia/Manila';
        $targetDate = \Carbon\Carbon::parse($data['date'], $timezone)->startOfDay();
        $businessStart = $targetDate->copy()->setTime(8, 0, 0)->setTimezone($timezone);
        $businessEnd = $targetDate->copy()->setTime(20, 0, 0)->setTimezone($timezone);
        
        // Generate FIXED time slots from 8 AM to 8 PM at regular intervals
        // Ensure we start exactly at 8:00 AM and end by 8:00 PM
        $allSlots = [];
        $cursor = $businessStart->copy();
        $latestStart = $businessEnd->copy()->subMinutes($durationMinutes);
        
        // Debug: Verify we're starting at 8 AM
        // $cursor should be at hour 8 (8 AM)
        
        while ($cursor->lte($latestStart)) {
            // Ensure cursor hour is between 8 and 20 (8 AM to 8 PM)
            $currentHour = (int)$cursor->format('H');
            if ($currentHour < 8 || $currentHour >= 20) {
                break; // Safety check: stop if we go outside business hours
            }
            $slotEnd = $cursor->copy()->addMinutes($durationMinutes);
            
            // Check if this slot is available (fits within a free block)
            $isAvailable = false;
            foreach ($freeBlocks as $block) {
                $blockStart = $block['start']->copy();
                $blockEnd = $block['end']->copy();
                
                // Clamp block to business hours
                if ($blockStart->lt($businessStart)) {
                    $blockStart = $businessStart->copy();
                }
                if ($blockEnd->gt($businessEnd)) {
                    $blockEnd = $businessEnd->copy();
                }
                
                // Check if slot fits completely within this free block
                if ($cursor->gte($blockStart) && 
                    $slotEnd->lte($blockEnd) &&
                    $slotEnd->lte($businessEnd)) {
                    $isAvailable = true;
                    break;
                }
            }
            
            // Return dates as local time strings (no timezone conversion)
            // Extract hour and minute directly to avoid timezone issues
            $dateStr = $data['date']; // e.g., "2025-12-26"
            
            // Get hour and minute from the cursor (should be 8-20 for 8 AM to 8 PM)
            $hour = (int)$cursor->format('H');
            $minute = (int)$cursor->format('i');
            $second = (int)$cursor->format('s');
            
            $endHour = (int)$slotEnd->format('H');
            $endMinute = (int)$slotEnd->format('i');
            $endSecond = (int)$slotEnd->format('s');
            
            // Format as ISO 8601 with Asia/Manila timezone to ensure correct timezone handling
            // Use the cursor's timezone-aware datetime
            $slotStartDateTime = $cursor->copy()->setTimezone($timezone);
            $slotEndDateTime = $slotEnd->copy()->setTimezone($timezone);
            
            $allSlots[] = [
                'start' => $slotStartDateTime->toIso8601String(),
                'end' => $slotEndDateTime->toIso8601String(),
                'available' => $isAvailable,
            ];
            
            $cursor->add($step);
        }

        return response()->json($allSlots);
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

    public function destroy(Stylist $stylist)
    {
        // Check if stylist has any appointments
        $appointmentCount = \App\Models\Appointment::where('stylist_id', $stylist->id)->count();
        
        if ($appointmentCount > 0) {
            return response()->json([
                'message' => 'Cannot delete stylist with existing appointments. Please deactivate instead.',
                'appointment_count' => $appointmentCount
            ], 422);
        }

        // Delete associated data
        $stylist->workingHours()->delete();
        $stylist->timeOffs()->delete();
        
        // Delete image if exists
        UploadStorage::delete($stylist->getRawOriginal('image'));

        $stylist->delete();
        return response()->json(['message' => 'Stylist deleted successfully']);
    }

    private function parseSpecializationIds(Request $request): array
    {
        $raw = $request->input('specialization_ids', []);

        if (is_string($raw)) {
            $decoded = json_decode($raw, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $raw = $decoded;
            } else {
                $raw = array_filter(array_map('trim', explode(',', $raw)));
            }
        }

        if (!is_array($raw)) {
            $raw = [$raw];
        }

        return collect($raw)
            ->flatten()
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $id > 0)
            ->unique()
            ->values()
            ->all();
    }

    private function areServiceIdsValid(array $serviceIds): bool
    {
        if (empty($serviceIds)) {
            return true;
        }

        return Service::whereIn('id', $serviceIds)->count() === count($serviceIds);
    }

    private function syncSpecializations(Stylist $stylist, array $serviceIds): void
    {
        if (!Schema::hasTable('stylist_services')) {
            return;
        }

        $stylist->services()->sync($serviceIds);
    }

    private function appendSpecializationPayload(Stylist $stylist): Stylist
    {
        $serviceNames = $stylist->specializedServices
            ? $stylist->specializedServices->pluck('name')->values()->all()
            : [];
        $serviceIds = $stylist->specializedServices
            ? $stylist->specializedServices->pluck('id')->map(fn ($id) => (int) $id)->values()->all()
            : [];

        $stylist->setAttribute('specialization_names', $serviceNames);
        $stylist->setAttribute('specialization_ids', $serviceIds);
        $stylist->setAttribute('image_url', $stylist->image_url);

        return $stylist;
    }
}
