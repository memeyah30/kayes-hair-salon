<?php

namespace App\Http\Controllers;

use App\Models\Admin;
use App\Models\Manager;
use App\Models\Stylist;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|string', // Keep as string to allow non-email identifiers
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

        // Login the user using the appropriate guard
        Auth::guard($guard)->login($user);
        
        // Regenerate session ID for security
        $request->session()->regenerate();
        
        // Ensure session is saved
        $request->session()->save();

        // #region agent log
        $logData = json_encode([
            'location' => 'AuthController.php:66',
            'message' => 'Login successful, session saved',
            'data' => [
                'userType' => $request->type,
                'guard' => $guard,
                'userId' => $user->id,
                'sessionId' => $request->session()->getId(),
                'hasSession' => $request->hasSession(),
                'requestHost' => $request->getHost(),
                'requestScheme' => $request->getScheme(),
                'requestUri' => $request->getRequestUri(),
            ],
            'timestamp' => time() * 1000,
            'sessionId' => 'debug-session',
            'runId' => 'run1',
            'hypothesisId' => 'E'
        ]);
        file_put_contents('c:\\Users\\Ruffa Mae S. Sapan\\OneDrive\\Desktop\\THOLITS SALON\\.cursor\\debug.log', $logData . "\n", FILE_APPEND);
        // #endregion

        return response()->json([
            'user' => $user,
            'type' => $request->type,
            'message' => 'Logged in successfully',
        ]);
    }

    public function logout(Request $request)
    {
        // Try to get user from any guard
        $user = Auth::guard('admin')->user() 
            ?? Auth::guard('manager')->user() 
            ?? Auth::guard('stylist')->user();
        
        if ($user) {
            $guard = $user instanceof Admin ? 'admin' 
                : ($user instanceof Manager ? 'manager' : 'stylist');
            
            Auth::guard($guard)->logout();
        }
        
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        
        return response()->json(['message' => 'Logged out']);
    }

    public function me(Request $request)
    {
        // #region agent log
        $logData = json_encode([
            'location' => 'AuthController.php:101',
            'message' => '/me endpoint called',
            'data' => [
                'hasSession' => $request->hasSession(),
                'sessionId' => $request->hasSession() ? $request->session()->getId() : null,
            ],
            'timestamp' => time() * 1000,
            'sessionId' => 'debug-session',
            'runId' => 'run1',
            'hypothesisId' => 'D'
        ]);
        file_put_contents('c:\\Users\\Ruffa Mae S. Sapan\\OneDrive\\Desktop\\THOLITS SALON\\.cursor\\debug.log', $logData . "\n", FILE_APPEND);
        // #endregion
        
        // Try to get user from any guard
        $user = Auth::guard('admin')->user() 
            ?? Auth::guard('manager')->user() 
            ?? Auth::guard('stylist')->user();
        
        // #region agent log
        $logData = json_encode([
            'location' => 'AuthController.php:110',
            'message' => 'User check result',
            'data' => [
                'hasUser' => $user !== null,
                'userType' => $user ? ($user instanceof \App\Models\Admin ? 'admin' : ($user instanceof \App\Models\Manager ? 'manager' : 'stylist')) : null,
            ],
            'timestamp' => time() * 1000,
            'sessionId' => 'debug-session',
            'runId' => 'run1',
            'hypothesisId' => 'D'
        ]);
        file_put_contents('c:\\Users\\Ruffa Mae S. Sapan\\OneDrive\\Desktop\\THOLITS SALON\\.cursor\\debug.log', $logData . "\n", FILE_APPEND);
        // #endregion
        
        if (!$user) {
            // #region agent log
            $logData = json_encode([
                'location' => 'AuthController.php:115',
                'message' => '/me endpoint returning 401',
                'data' => [],
                'timestamp' => time() * 1000,
                'sessionId' => 'debug-session',
                'runId' => 'run1',
                'hypothesisId' => 'D'
            ]);
            file_put_contents('c:\\Users\\Ruffa Mae S. Sapan\\OneDrive\\Desktop\\THOLITS SALON\\.cursor\\debug.log', $logData . "\n", FILE_APPEND);
            // #endregion
            return response()->json(['message' => 'Not authenticated'], 401);
        }
        
        // Determine user type
        $type = $user instanceof \App\Models\Admin
            ? 'admin'
            : ($user instanceof \App\Models\Manager ? 'manager' : 'stylist');
        $userPayload = $user instanceof \Illuminate\Database\Eloquent\Model
            ? $user->toArray()
            : (array) $user;

        return response()->json([
            ...$userPayload,
            'type' => $type,
        ]);
    }
}
