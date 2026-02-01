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
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $type = null;
        if ($user instanceof Admin) {
            $type = 'admin';
        } elseif ($user instanceof Manager) {
            $type = 'manager';
        } elseif ($user instanceof Stylist) {
            $type = 'stylist';
        }

        if (!$type || (count($types) > 0 && !in_array($type, $types, true))) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return $next($request);
    }
}



