<?php

namespace App\Http\Controllers;

use App\Models\Admin;
use App\Models\Stylist;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
            'type' => 'required|in:admin,stylist',
        ]);

        $user = null;
        if ($request->type === 'admin') {
            $user = Admin::where('email', $request->email)->first();
        } else {
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
        $type = $user instanceof \App\Models\Admin ? 'admin' : 'stylist';
        return response()->json([
            ...$user->toArray(),
            'type' => $type,
        ]);
    }
}
