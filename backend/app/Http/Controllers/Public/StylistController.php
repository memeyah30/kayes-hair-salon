<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Staff;
use App\Models\Stylist;

class StylistController extends Controller
{
    public function index()
    {
        return $this->getAllStylists();
    }

    public function getAllStylists()
    {
        return response()->json($this->bookableStylistPayloads());
    }

    public function byServices()
    {
        return response()->json(
            $this->bookableStylistPayloads()
                ->map(fn (array $stylist) => [
                    'id' => $stylist['id'],
                    'name' => $stylist['name'],
                    'avatar' => $stylist['avatar'] ?? null,
                    'photo' => $stylist['photo'] ?? null,
                    'specialization_names' => $stylist['specialization_names'] ?? [],
                ])
                ->values()
        );
    }

    public function getStylistsByService(int $serviceId)
    {
        return $this->byServices();
    }

    private function bookableStylistPayloads()
    {
        $approvedStaff = Staff::query()
            ->with(['user.workingHours', 'user.timeOffs', 'user.specializedServices:id,name'])
            ->where('status', 'approved')
            ->where('role', 'stylist')
            ->whereNotNull('user_id')
            ->get()
            ->filter(fn (Staff $staff) => $staff->user && (bool) $staff->user->active)
            ->values();

        $approvedStylistIds = $approvedStaff
            ->pluck('user_id')
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        $legacyStylists = Stylist::query()
            ->with(['workingHours', 'timeOffs', 'specializedServices:id,name'])
            ->where('active', true)
            ->where(function ($query) {
                $query->where('role', 'stylist')
                    ->orWhereNull('role');
            })
            ->when($approvedStylistIds->isNotEmpty(), function ($query) use ($approvedStylistIds) {
                $query->whereNotIn('id', $approvedStylistIds->all());
            })
            ->orderBy('name');

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
            ->get()
            ->map(fn (Stylist $stylist) => $this->toStylistPayload($stylist))
            ->values();

        return $approvedPayload
            ->concat($legacyPayload)
            ->sortBy(fn (array $stylist) => strtolower((string) ($stylist['name'] ?? '')))
            ->values();
    }

    private function toStylistPayload(Stylist $stylist, ?Staff $staff = null): array
    {
        $legacySpecializations = $staff?->specialization;
        if ($legacySpecializations === null && is_array($stylist->specializations ?? null)) {
            $legacySpecializations = $stylist->specializations;
        }

        $workingHours = $stylist->workingHours ? $stylist->workingHours->values()->toArray() : [];
        $timeOffs = $stylist->timeOffs ? $stylist->timeOffs->values()->toArray() : [];
        $specializedServices = $stylist->relationLoaded('specializedServices') && $stylist->specializedServices
            ? $stylist->specializedServices
            : collect();

        return [
            'id' => $stylist->id,
            'name' => $stylist->name,
            'email' => $stylist->email,
            'phone' => $stylist->phone,
            'image' => $stylist->image,
            'avatar' => $stylist->image ?: null,
            'photo' => $stylist->image ?: null,
            'active' => (bool) $stylist->active,
            'role' => $stylist->role ?: 'stylist',
            'specializations' => $legacySpecializations,
            'specialization_ids' => $specializedServices->pluck('id')->map(fn ($id) => (int) $id)->values()->all(),
            'specialization_names' => $specializedServices->pluck('name')->values()->all(),
            'workingHours' => $workingHours,
            'working_hours' => $workingHours,
            'timeOffs' => $timeOffs,
            'time_offs' => $timeOffs,
        ];
    }
}
