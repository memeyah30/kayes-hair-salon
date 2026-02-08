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

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$userType || (count($types) > 0 && !in_array($userType, $types, true))) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return $next($request);
    }
}


