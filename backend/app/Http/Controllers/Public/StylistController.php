<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Staff;
use App\Models\Stylist;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class StylistController extends Controller
{
    public function index()
    {
        $approvedStaff = Staff::query()
            ->with(['user.workingHours', 'user.timeOffs', 'user.specializedServices'])
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
            ->with(['workingHours', 'timeOffs', 'specializedServices'])
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

    public function byServices(Request $request)
    {
        $request->validate([
            'services' => 'array',
            'services.*' => 'integer|exists:services,id',
        ]);

        $rawServiceIds = $request->query('services', []);
        if (!is_array($rawServiceIds)) {
            $rawServiceIds = [$rawServiceIds];
        }

        $serviceIds = collect($rawServiceIds)
            ->flatten()
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $id > 0)
            ->unique()
            ->values();

        $hasSpecializationPivot = Schema::hasTable('service_stylist');

        $query = Stylist::query()
            ->where('active', true)
            ->where('role', 'stylist');

        if ($hasSpecializationPivot) {
            $query->with(['specializedServices:id,name']);
        }

        if ($hasSpecializationPivot && $serviceIds->isNotEmpty()) {
            $query->whereHas('specializedServices', function ($relationQuery) use ($serviceIds) {
                $relationQuery->whereIn('services.id', $serviceIds->all());
            }, '=', $serviceIds->count());
        }

        $stylists = $query->orderBy('name')->get();

        return response()->json(
            $stylists->map(function (Stylist $stylist) use ($hasSpecializationPivot) {
                return [
                    'id' => $stylist->id,
                    'name' => $stylist->name,
                    'avatar' => $stylist->image ?: null,
                    'photo' => $stylist->image ?: null,
                    'specialization_names' => $hasSpecializationPivot && $stylist->specializedServices
                        ? $stylist->specializedServices->pluck('name')->values()->all()
                        : [],
                ];
            })->values()
        );
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
