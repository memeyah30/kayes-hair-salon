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
        // Prefer the active guard from session, then fall back.
        $activeGuard = $request->session()->get('active_guard');
        $guards = array_values(array_unique(array_filter([
            $activeGuard,
            'admin',
            'manager',
            'stylist',
            'web',
        ])));
        
        foreach ($guards as $guard) {
            if (Auth::guard($guard)->check()) {
                // Bind the detected guard so $request->user() resolves correctly downstream.
                Auth::shouldUse($guard);
                $request->setUserResolver(function () use ($guard) {
                    return Auth::guard($guard)->user();
                });
                return $next($request);
            }
        }

        // No user authenticated via any guard
        return response()->json(['message' => 'Unauthenticated'], 401);
    }
}
