<?php

namespace App\Http\Controllers;

use App\Models\Admin;
use App\Models\Manager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use App\Mail\PasswordResetMail;

class PasswordResetController extends Controller
{
    /**
     * Send a reset link to the given user.
     */
    public function sendResetLinkEmail(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $email = $request->email;
        $user = null;
        $broker = null;

        // 1. Try to find an Admin
        $user = Admin::where('email', $email)->first();
        if ($user) {
            $broker = 'admins';
        } else {
            // 2. Try to find a Manager
            $user = Manager::where('email', $email)->first();
            if ($user) {
                $broker = 'managers';
            }
        }

        if (!$user) {
            return response()->json([
                'message' => 'We cant find a user with that email address.'
            ], 404);
        }

        // Create token
        $token = Password::broker($broker)->createToken($user);

        // Send email
        Mail::to($user->email)->send(new PasswordResetMail($token, $user->email));

        return response()->json([
            'message' => 'Password reset link sent to your email.'
        ]);
    }

    /**
     * Reset the given user's password.
     */
    public function reset(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|min:6|confirmed',
        ]);

        $email = $request->email;
        $user = null;
        $broker = null;

        // Find the user and broker
        $user = Admin::where('email', $email)->first();
        if ($user) {
            $broker = 'admins';
        } else {
            $user = Manager::where('email', $email)->first();
            if ($user) {
                $broker = 'managers';
            }
        }

        if (!$user) {
            return response()->json(['message' => 'Invalid user.'], 404);
        }

        // Reset password using the broker
        $status = Password::broker($broker)->reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->password = $password;
                $user->save();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json(['message' => 'Password has been reset successfully.']);
        }

        return response()->json([
            'message' => __($status)
        ], 400);
    }
}
