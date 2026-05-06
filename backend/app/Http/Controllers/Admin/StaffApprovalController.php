<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\RejectStaffRequest;
use App\Models\Staff;
use Illuminate\Http\Request;

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

        $staff->status = 'approved';
        $staff->approved_by_admin_id = $admin->id;
        $staff->approved_at = now();
        $staff->rejected_reason = null;
        $staff->save();

        $staff = $staff->fresh(['createdByManager:id,name,username', 'approvedByAdmin:id,name']);
        return response()->json([
            'message' => 'Staff approved successfully.',
            'staff' => $staff,
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
