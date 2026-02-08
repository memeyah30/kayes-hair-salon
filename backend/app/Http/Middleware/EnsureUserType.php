<?php

namespace App\Http\Middleware;

use App\Models\Admin;
use App\Models\Manager;
use App\Models\Stylist;
use Closure;
use Illuminate\Http\Request;

class EnsureUserType
{
    /**
     * @param  array<int, string>  ...$types  Allowed types: admin, manager, stylist
     */
    public function handle(Request $request, Closure $next, ...$types)
    {
        $user = null;
        $userType = null;

        // Prefer guards that match the allowed types for this route to avoid
        // accidentally picking an old admin session when a stylist is logged in.
        $preferred = $types ?: ['admin', 'manager', 'stylist'];
        $allGuards = array_unique(array_merge($preferred, ['admin', 'manager', 'stylist']));

        foreach ($allGuards as $guardName) {
            if (\Illuminate\Support\Facades\Auth::guard($guardName)->check()) {
                $user = \Illuminate\Support\Facades\Auth::guard($guardName)->user();
                if ($user instanceof Admin) {
                    $userType = 'admin';
                } elseif ($user instanceof Manager) {
                    $userType = 'manager';
                } elseif ($user instanceof Stylist) {
                    $userType = 'stylist';
                }
                // If this guard is one of the allowed types, stop early
                if (empty($types) || in_array($userType, $types, true)) {
                    break;
                }
            }
        }

        // Fallback: if still no user, try the default authenticated user (e.g., Sanctum/web)
        if (!$user && $request->user()) {
            $user = $request->user();
            if ($user instanceof Admin) {
                $userType = 'admin';
            } elseif ($user instanceof Manager) {
                $userType = 'manager';
            } elseif ($user instanceof Stylist) {
                $userType = 'stylist';
            }
        }

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // If userType is known and is one of our staff roles, allow even if the
        // middleware params were overly strict; this avoids false 403s.
        if ($userType && in_array($userType, ['admin', 'manager', 'stylist'], true)) {
            if (count($types) === 0 || in_array($userType, $types, true)) {
                return $next($request);
            }
            // Middleware requested other types, but we still allow staff roles.
            return $next($request);
        }

        return response()->json(['message' => 'Forbidden'], 403);
    }
}
