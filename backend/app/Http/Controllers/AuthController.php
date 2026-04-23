<?php

namespace App\Http\Controllers;

use App\Models\Admin;
use App\Models\Manager;
use App\Models\Stylist;
use App\Support\UploadStorage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private function resolveActiveUser(Request $request)
    {
        $activeGuard = $request->session()->get('active_guard');
        $typeHint = $request->header('X-User-Type') ?: $request->query('type');
        $hintGuard = in_array($typeHint, ['admin', 'manager', 'stylist'], true) ? $typeHint : null;

        $guards = array_values(array_unique(array_filter([
            $hintGuard,
            $activeGuard,
            'admin',
            'manager',
            'stylist',
        ])));

        foreach ($guards as $guard) {
            if (Auth::guard($guard)->check()) {
                return Auth::guard($guard)->user();
            }
        }

        return null;
    }

    private function resolveUserType($user): ?string
    {
        if ($user instanceof \App\Models\Admin) {
            return 'admin';
        }
        if ($user instanceof \App\Models\Manager) {
            return 'manager';
        }
        if ($user instanceof \App\Models\Stylist) {
            return 'stylist';
        }
        return null;
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|string', // Keep as string to allow non-email identifiers
            'password' => 'required',
            'type' => 'required|in:admin,manager,stylist',
        ]);

        if ($request->type === 'stylist') {
            return response()->json([
                'message' => 'Staff login is no longer available.',
            ], 403);
        }

        $user = null;
        if ($request->type === 'admin') {
            // Allow login with 'admin' username or email
            // Support both 'admin' and 'admin@tholits.local' for backward compatibility
            $email = $request->email;
            if ($email === 'admin') {
                // Try 'admin' first, then fallback to 'admin@tholits.local'
                $user = Admin::where('email', 'admin')->first();
                if (!$user) {
                    $user = Admin::where('email', 'admin@tholits.local')->first();
                    // If found with old email, update it to 'admin'
                    if ($user) {
                        $user->email = 'admin';
                        $user->save();
                    }
                }
            } else {
                $user = Admin::where('email', $email)->first();
            }
        } elseif ($request->type === 'manager') {
            // Managers login with username (stored in the "email" field of the request for UI compatibility)
            $user = Manager::where('username', $request->email)->where('active', true)->first();
        } else {
            // Stylists can login using email or phone (email is optional in the model)
            $identifier = $request->email;
            $user = Stylist::where('active', true)
                ->where(function ($query) use ($identifier) {
                    $query->where('email', $identifier)
                        ->orWhere('phone', $identifier);
                })
                ->first();
        }

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Use session-based authentication
        // Determine the guard based on user type
        $guard = match($request->type) {
            'admin' => 'admin',
            'manager' => 'manager',
            'stylist' => 'stylist',
            default => 'web',
        };

        // Login the user using the requested guard. Do not force-logout other
        // guards so admin/manager/staff sessions can coexist in separate tabs.
        Auth::guard($guard)->login($user);
        $request->session()->put('active_guard', $guard);
        $request->session()->put('active_user_type', $request->type);
        
        // Regenerate session ID for security
        $request->session()->regenerate();

        return response()->json([
            'user' => $user,
            'type' => $request->type,
            'message' => 'Logged in successfully',
        ]);
    }

    public function logout(Request $request)
    {
        // Logout all guards to ensure clean session state.
        foreach (['admin', 'manager', 'stylist', 'web'] as $guard) {
            Auth::guard($guard)->logout();
        }
        
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        
        return response()->json(['message' => 'Logged out']);
    }

    public function me(Request $request)
    {
        $user = $this->resolveActiveUser($request);

        if (!$user) {
            return response()->json(['message' => 'Not authenticated'], 401);
        }
        
        $type = $this->resolveUserType($user);
        $userPayload = $user instanceof \Illuminate\Database\Eloquent\Model
            ? $user->toArray()
            : (array) $user;

        return response()->json([
            ...$userPayload,
            'type' => $type,
        ]);
    }

    public function updateProfilePhoto(Request $request)
    {
        $user = $this->resolveActiveUser($request);
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        if (!($user instanceof Manager || $user instanceof Stylist)) {
            return response()->json(['message' => 'Profile photo editing is only available for manager and staff accounts'], 403);
        }

        $data = $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $folder = $user instanceof Manager ? 'uploads/managers' : 'uploads/stylists';
        $oldPath = $user->getRawOriginal('image');
        $user->image = UploadStorage::store($data['image'], $folder);
        $user->save();

        if ($oldPath && $oldPath !== $user->getRawOriginal('image')) {
            UploadStorage::delete($oldPath);
        }

        return response()->json([
            'message' => 'Profile photo updated successfully',
            'user' => $user->fresh(),
            'type' => $this->resolveUserType($user),
        ]);
    }

    public function removeProfilePhoto(Request $request)
    {
        $user = $this->resolveActiveUser($request);
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        if (!($user instanceof Manager || $user instanceof Stylist)) {
            return response()->json(['message' => 'Profile photo editing is only available for manager and staff accounts'], 403);
        }

        $oldPath = $user->getRawOriginal('image');
        $user->image = null;
        $user->save();

        if ($oldPath) {
            UploadStorage::delete($oldPath);
        }

        return response()->json([
            'message' => 'Profile photo removed successfully',
            'user' => $user->fresh(),
            'type' => $this->resolveUserType($user),
        ]);
    }
}
