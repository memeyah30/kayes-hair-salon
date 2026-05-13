<?php

namespace App\Http\Controllers;

use App\Models\Admin;
use App\Models\Manager;
use App\Support\PasswordHash;
use App\Support\UploadStorage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private function resolveActiveUser(Request $request)
    {
        $activeGuard = $request->session()->get('active_guard');
        $typeHint = $request->header('X-User-Type') ?: $request->query('type');
        $hintGuard = in_array($typeHint, ['admin', 'manager'], true) ? $typeHint : null;

        $guards = array_values(array_unique(array_filter([
            $hintGuard,
            $activeGuard,
            'admin',
            'manager',
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
        return null;
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|string', // Identifier (Email or Username)
            'password' => 'required',
        ]);

        $identifier = $request->email;
        $user = null;
        $type = null;

        // 1. Try to find an Admin
        if ($identifier === 'admin') {
            $user = Admin::where('email', 'admin')->first();
            if (!$user) {
                $user = Admin::where('email', 'admin@tholits.local')->first();
                if ($user) {
                    $user->email = 'admin';
                    $user->save();
                }
            }
        } else {
            $user = Admin::where('email', $identifier)->first();
        }

        if ($user && PasswordHash::matches($request->password, $user->password)) {
            $type = 'admin';
        } else {
            // 2. If not an Admin, try to find a Manager
            $user = Manager::where(function($query) use ($identifier) {
                $query->where('username', $identifier)
                      ->orWhere('email', $identifier);
            })->where('active', true)->first();
            
            if ($user && PasswordHash::matches($request->password, $user->password)) {
                $type = 'manager';
            } else {
                $user = null; // Reset if password doesn't match
            }
        }

        if (!$user) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        PasswordHash::upgradeIfNeeded($user, $request->password);

        // Use session-based authentication
        $guard = $type;

        Auth::guard($guard)->login($user);
        $request->session()->put('active_guard', $guard);
        $request->session()->put('active_user_type', $type);
        
        $request->session()->regenerate();

        return response()->json([
            'user' => $user,
            'type' => $type,
            'message' => 'Logged in successfully',
        ]);
    }

    public function logout(Request $request)
    {
        // Logout all guards to ensure clean session state.
        foreach (['admin', 'manager', 'web'] as $guard) {
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

        if (!($user instanceof Manager)) {
            return response()->json(['message' => 'Profile photo editing is only available for manager accounts'], 403);
        }

        $data = $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $folder = 'uploads/managers';
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

        if (!($user instanceof Manager)) {
            return response()->json(['message' => 'Profile photo editing is only available for manager accounts'], 403);
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
