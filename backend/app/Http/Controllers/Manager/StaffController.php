<?php

namespace App\Http\Controllers\Manager;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreStaffRequest;
use App\Models\Staff;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

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

        $photoPath = null;
        if ($request->hasFile('photo')) {
            $photoPath = Storage::disk('public')->putFile('staff', $request->file('photo'));
        }

        $staff = Staff::create([
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
            'role' => $data['role'] ?? 'stylist',
            'specialization' => $data['specialization'] ?? null,
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

