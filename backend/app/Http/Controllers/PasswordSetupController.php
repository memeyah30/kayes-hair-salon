<?php

namespace App\Http\Controllers;

use App\Models\Manager;
use App\Models\PasswordSetupToken;
use App\Models\Service;
use App\Models\Staff;
use App\Models\Stylist;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class PasswordSetupController extends Controller
{
    public function show(string $token)
    {
        $setupToken = $this->resolveValidToken($token);

        if (!$setupToken) {
            return response()->view('auth.setup-password', [
                'token' => $token,
                'email' => null,
                'expired' => true,
                'message' => 'Your password setup link has expired. Please contact the administrator.',
            ], 410);
        }

        return view('auth.setup-password', [
            'token' => $token,
            'email' => $setupToken->user->email,
            'expired' => false,
            'message' => null,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'size:64'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $setupToken = $this->resolveValidToken($data['token']);

        if (!$setupToken) {
            return redirect()
                ->route('password.setup.show', ['token' => $data['token']])
                ->withErrors([
                    'token' => 'Your password setup link has expired. Please contact the administrator.',
                ]);
        }

        $user = $setupToken->user;

        DB::transaction(function () use ($user, $data) {
            $user->forceFill([
                'password' => Hash::make($data['password']),
                'status' => 'active',
            ])->save();

            $this->syncRoleAccount($user);

            PasswordSetupToken::query()
                ->where('user_id', $user->id)
                ->delete();
        });

        return redirect($this->resolveLoginPath($user));
    }

    private function resolveValidToken(string $token): ?PasswordSetupToken
    {
        $setupToken = PasswordSetupToken::query()
            ->with('user')
            ->where('token', $token)
            ->first();

        if (!$setupToken || !$setupToken->user) {
            return null;
        }

        if ($setupToken->expires_at->isPast() || $setupToken->user->status !== 'pending_password') {
            PasswordSetupToken::query()
                ->where('user_id', $setupToken->user_id)
                ->delete();

            return null;
        }

        return $setupToken;
    }

    private function syncRoleAccount(User $user): void
    {
        $name = trim((string) $user->name);
        $image = $user->image;

        if ($user->role === 'manager') {
            $manager = Manager::query()
                ->where('username', $user->email)
                ->first();

            if (!$manager) {
                Manager::create([
                    'name' => $name,
                    'username' => $user->email,
                    'password' => $user->password,
                    'image' => $image,
                    'active' => true,
                ]);
            } else {
                $manager->update([
                    'name' => $name,
                    'username' => $user->email,
                    'password' => $user->password,
                    'image' => $image ?: $manager->image,
                    'active' => true,
                ]);
            }

            return;
        }

        $stylist = Stylist::query()
            ->where('email', $user->email)
            ->first();

        if (!$stylist) {
            $stylist = Stylist::create([
                'name' => $name,
                'email' => $user->email,
                'phone' => $user->phone,
                'password' => $user->password,
                'image' => $image,
                'active' => true,
                'role' => 'stylist',
            ]);
        } else {
            $stylist->update([
                'name' => $name,
                'email' => $user->email,
                'phone' => $user->phone ?: $stylist->phone,
                'password' => $user->password,
                'image' => $image ?: $stylist->image,
                'active' => true,
                'role' => 'stylist',
            ]);
        }

        $approvedStaffRequest = Staff::query()
            ->where('email', $user->email)
            ->where('role', 'stylist')
            ->whereIn('status', ['approved', 'pending_password'])
            ->latest()
            ->first();

        $this->syncStylistServicesFromStaff($stylist, $approvedStaffRequest);

        $approvedStaffRequest?->update([
            'user_id' => $stylist->id,
            'status' => 'approved',
        ]);
    }

    private function resolveLoginPath(User $user): string
    {
        return $user->role === 'manager'
            ? '/login/manager'
            : '/login';
    }

    private function syncStylistServicesFromStaff(Stylist $stylist, ?Staff $staff): void
    {
        if (!$staff || !Schema::hasTable('stylist_services')) {
            return;
        }

        $specializationNames = collect(is_array($staff->specialization) ? $staff->specialization : [])
            ->map(fn ($value) => trim((string) $value))
            ->filter()
            ->unique()
            ->values();

        if ($specializationNames->isEmpty()) {
            $stylist->services()->sync([]);
            return;
        }

        $serviceIds = Service::query()
            ->whereIn('name', $specializationNames->all())
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();

        $stylist->services()->sync($serviceIds);
    }
}
