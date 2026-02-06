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

        // Check all guards to find the authenticated user
        foreach (['admin', 'manager', 'stylist'] as $guardName) {
            if (\Illuminate\Support\Facades\Auth::guard($guardName)->check()) {
                $user = \Illuminate\Support\Facades\Auth::guard($guardName)->user();
                // Determine user type based on model instance
                if ($user instanceof Admin) {
                    $userType = 'admin';
                } elseif ($user instanceof Manager) {
                    $userType = 'manager';
                } elseif ($user instanceof Stylist) {
                    $userType = 'stylist';
                }
                break; // Found the authenticated user
            }
        }

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$userType || (count($types) > 0 && !in_array($userType, $types, true))) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return $next($request);
    }
}



