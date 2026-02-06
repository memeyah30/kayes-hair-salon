<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthenticateAnyGuard
{
    /**
     * Handle an incoming request.
     * Checks if user is authenticated via any guard (admin, manager, stylist, web)
     */
    public function handle(Request $request, Closure $next)
    {
        // Check all guards to see if any user is authenticated
        $guards = ['admin', 'manager', 'stylist', 'web'];
        
        foreach ($guards as $guard) {
            if (Auth::guard($guard)->check()) {
                // User is authenticated via this guard
                return $next($request);
            }
        }

        // No user authenticated via any guard
        return response()->json(['message' => 'Unauthenticated'], 401);
    }
}
