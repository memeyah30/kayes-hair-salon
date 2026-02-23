<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Staff;
use App\Models\Stylist;

class StylistController extends Controller
{
    public function index()
    {
        $approvedStaff = Staff::query()
            ->with(['user.workingHours', 'user.timeOffs'])
            ->where('status', 'approved')
            ->where('role', 'stylist')
            ->whereNotNull('user_id')
            ->get();

        $approvedStylistIds = $approvedStaff
            ->pluck('user_id')
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        $legacyStylists = Stylist::query()
            ->with(['workingHours', 'timeOffs'])
            ->where('active', true)
            ->where('role', 'stylist')
            ->when($approvedStylistIds->isNotEmpty(), function ($query) use ($approvedStylistIds) {
                $query->whereNotIn('id', $approvedStylistIds->all());
            })
            ->get();

        $approvedPayload = $approvedStaff
            ->map(function (Staff $staff) {
                if (!$staff->user) {
                    return null;
                }

                return $this->toStylistPayload($staff->user, $staff);
            })
            ->filter()
            ->values();

        $legacyPayload = $legacyStylists
            ->map(fn (Stylist $stylist) => $this->toStylistPayload($stylist))
            ->values();

        return response()->json(
            $approvedPayload->concat($legacyPayload)->values()
        );
    }

    private function toStylistPayload(Stylist $stylist, ?Staff $staff = null): array
    {
        $specializations = $staff?->specialization;
        if ($specializations === null && is_array($stylist->specializations ?? null)) {
            $specializations = $stylist->specializations;
        }

        $workingHours = $stylist->workingHours ? $stylist->workingHours->values()->toArray() : [];
        $timeOffs = $stylist->timeOffs ? $stylist->timeOffs->values()->toArray() : [];

        return [
            'id' => $stylist->id,
            'name' => $stylist->name,
            'email' => $stylist->email,
            'phone' => $stylist->phone,
            'image' => $stylist->image,
            'active' => (bool) $stylist->active,
            'role' => $stylist->role ?: 'stylist',
            'specializations' => $specializations,
            'workingHours' => $workingHours,
            'working_hours' => $workingHours,
            'timeOffs' => $timeOffs,
            'time_offs' => $timeOffs,
        ];
    }
}
