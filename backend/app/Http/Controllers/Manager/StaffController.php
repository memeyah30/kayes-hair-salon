<?php

namespace App\Http\Controllers\Manager;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreStaffRequest;
use App\Models\Service;
use App\Models\Staff;
use App\Support\UploadStorage;
use Illuminate\Http\Request;

class StaffController extends Controller
{
    public function index(Request $request)
    {
        $manager = $request->user();

        $staff = Staff::query()
            ->with(['approvedByAdmin:id,name'])
            ->where('created_by_manager_id', $manager->id)
            ->latest()
            ->get();

        return response()->json($staff);
    }

    public function store(StoreStaffRequest $request)
    {
        $manager = $request->user();
        $data = $request->validated();
        $selectedServiceIds = ($data['role'] ?? 'stylist') === 'stylist'
            ? collect($data['specialization_ids'] ?? [])
                ->map(fn ($id) => (int) $id)
                ->filter(fn ($id) => $id > 0)
                ->unique()
                ->values()
            : collect();

        $selectedServiceNames = collect();
        if ($selectedServiceIds->isNotEmpty()) {
            $servicesById = Service::query()
                ->whereIn('id', $selectedServiceIds->all())
                ->get(['id', 'name'])
                ->keyBy('id');

            $selectedServiceNames = $selectedServiceIds
                ->map(fn ($id) => $servicesById->get($id)?->name)
                ->filter()
                ->values();
        } elseif (!empty($data['specialization']) && is_array($data['specialization'])) {
            $selectedServiceNames = collect($data['specialization'])
                ->map(fn ($value) => trim((string) $value))
                ->filter()
                ->values();
        }

        $photoPath = null;
        if ($request->hasFile('photo')) {
            $photoPath = UploadStorage::store($request->file('photo'), 'staff');
        }

        $staff = Staff::create([
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
            'role' => $data['role'] ?? 'stylist',
            'specialization' => $selectedServiceNames->isNotEmpty() ? $selectedServiceNames->all() : null,
            'photo_path' => $photoPath,
            'status' => 'pending',
            'created_by_manager_id' => $manager->id,
            'approved_by_admin_id' => null,
            'approved_at' => null,
            'rejected_reason' => null,
        ]);

        return response()->json([
            'message' => 'Staff request submitted for approval.',
            'staff' => $staff->fresh(),
        ], 201);
    }
}
