<?php

namespace App\Http\Middleware;

use App\Models\Admin;
use App\Models\Manager;
use App\Models\Stylist;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class EnsureUserType
{
    private function unauthenticatedResponse(Request $request)
    {
        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        return redirect('/login');
    }

    private function forbiddenResponse(Request $request)
    {
        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        abort(403);
    }

    /**
     * @param  array<int, string>  ...$types  Allowed types: admin, manager
     */
    public function handle(Request $request, Closure $next, ...$types)
    {
        $user = null;
        $userType = null;
        $hint = strtolower((string) ($request->header('X-User-Type') ?: $request->query('type', '')));
        $hintGuard = in_array($hint, ['admin', 'manager'], true) ? $hint : null;

        // If a tab explicitly requests a user type, enforce it first.
        if ($hintGuard) {
            if (!Auth::guard($hintGuard)->check()) {
                return $this->unauthenticatedResponse($request);
            }

            $user = Auth::guard($hintGuard)->user();
            $userType = $this->resolveUserType($user);
            Auth::shouldUse($hintGuard);
            $request->setUserResolver(function () use ($hintGuard) {
                return Auth::guard($hintGuard)->user();
            });
            $request->attributes->set('resolved_user_type', $userType);
            $request->attributes->set('resolved_guard', $hintGuard);

            if (count($types) > 0 && !in_array($userType, $types, true)) {
                return $this->forbiddenResponse($request);
            }

            return $next($request);
        }

        // Prefer explicit active guard, then guards requested by route.
        $activeGuard = $request->session()->get('active_guard');
        $preferred = $types ?: ['admin', 'manager'];
        $allGuards = array_unique(array_merge(
            array_filter([$activeGuard]),
            $preferred,
            ['admin', 'manager']
        ));

        foreach ($allGuards as $guardName) {
            if (Auth::guard($guardName)->check()) {
                $user = Auth::guard($guardName)->user();
                $userType = $this->resolveUserType($user);
                // If this guard is one of the allowed types, stop early
                if (empty($types) || in_array($userType, $types, true)) {
                    Auth::shouldUse($guardName);
                    $request->setUserResolver(function () use ($guardName) {
                        return Auth::guard($guardName)->user();
                    });
                    $request->attributes->set('resolved_user_type', $userType);
                    $request->attributes->set('resolved_guard', $guardName);
                    break;
                }
            }
        }

        // Fallback: if still no user, try the default authenticated user (e.g., Sanctum/web)
        if (!$user && $request->user()) {
            $user = $request->user();
            $userType = $this->resolveUserType($user);
            $request->attributes->set('resolved_user_type', $userType);
            $request->attributes->set('resolved_guard', null);
        }

        if (!$user) {
            return $this->unauthenticatedResponse($request);
        }

        if (count($types) > 0 && !in_array($userType, $types, true)) {
            return $this->forbiddenResponse($request);
        }

        return $next($request);
    }

    private function resolveUserType($user): ?string
    {
        if ($user instanceof Admin) return 'admin';
        if ($user instanceof Manager) return 'manager';
        return null;
    }
}
