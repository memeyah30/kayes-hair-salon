<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\RejectStaffRequest;
use App\Models\Staff;
use App\Models\Stylist;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class StaffApprovalController extends Controller
{
    public function pendingIndex()
    {
        $pending = Staff::query()
            ->with(['createdByManager:id,name,username'])
            ->where('status', 'pending')
            ->latest()
            ->get();

        return response()->json($pending);
    }

    public function approve(Request $request, int $id)
    {
        $admin = $request->user();
        $staff = Staff::query()->findOrFail($id);

        if ($staff->status !== 'pending') {
            return response()->json([
                'message' => 'Only pending staff can be approved.',
            ], 409);
        }

        DB::transaction(function () use ($staff, $admin) {
            if ($staff->role === 'stylist') {
                $name = trim($staff->first_name . ' ' . $staff->last_name);
                $photoPath = null;
                if (!empty($staff->photo_path)) {
                    $normalized = ltrim((string) $staff->photo_path, '/');
                    $photoPath = str_starts_with($normalized, 'storage/')
                        ? $normalized
                        : 'storage/' . $normalized;
                }

                $stylist = null;
                if ($staff->user_id) {
                    $stylist = Stylist::query()->find($staff->user_id);
                }
                if (!$stylist && !empty($staff->email)) {
                    $stylist = Stylist::query()->where('email', $staff->email)->first();
                }

                if (!$stylist) {
                    $stylist = Stylist::create([
                        'name' => $name,
                        'email' => $staff->email,
                        'phone' => $staff->phone,
                        'password' => Str::random(16),
                        'image' => $photoPath,
                        'active' => true,
                        'role' => 'stylist',
                    ]);
                } else {
                    $stylist->update([
                        'name' => $name,
                        'email' => $staff->email ?: $stylist->email,
                        'phone' => $staff->phone ?: $stylist->phone,
                        'image' => $photoPath ?: $stylist->image,
                        'active' => true,
                        'role' => 'stylist',
                    ]);
                }

                $staff->user_id = $stylist->id;
            }

            $staff->status = 'approved';
            $staff->approved_by_admin_id = $admin->id;
            $staff->approved_at = now();
            $staff->rejected_reason = null;
            $staff->save();
        });

        return response()->json([
            'message' => 'Staff approved successfully.',
            'staff' => $staff->fresh(['createdByManager:id,name,username', 'approvedByAdmin:id,name', 'user']),
        ]);
    }

    public function reject(RejectStaffRequest $request, int $id)
    {
        $staff = Staff::query()->findOrFail($id);

        if ($staff->status !== 'pending') {
            return response()->json([
                'message' => 'Only pending staff can be rejected.',
            ], 409);
        }

        $staff->update([
            'status' => 'rejected',
            'rejected_reason' => $request->validated('rejected_reason'),
            'approved_by_admin_id' => null,
            'approved_at' => null,
        ]);

        return response()->json([
            'message' => 'Staff rejected successfully.',
            'staff' => $staff->fresh(['createdByManager:id,name,username']),
        ]);
    }
}
