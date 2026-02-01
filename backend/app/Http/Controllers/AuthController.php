<?php

namespace App\Http\Controllers;

use App\Models\Admin;
use App\Models\Manager;
use App\Models\Stylist;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|string', // Changed from 'email' to 'string' to allow 'admin' as username
            'password' => 'required',
            'type' => 'required|in:admin,manager,stylist',
        ]);

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
            $request->validate(['email' => 'required|email']); // Stylists still need email format
            $user = Stylist::where('email', $request->email)->where('active', true)->first();
        }

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $token = $user->createToken($request->type . '-token', ['*'])->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
            'type' => $request->type,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out']);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        // Determine user type
        $type = $user instanceof \App\Models\Admin
            ? 'admin'
            : ($user instanceof \App\Models\Manager ? 'manager' : 'stylist');
        return response()->json([
            ...$user->toArray(),
            'type' => $type,
        ]);
    }
}
