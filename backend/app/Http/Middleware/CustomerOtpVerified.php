<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class CustomerOtpVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken() ?: $request->header('X-Customer-Token');
        $email = $this->normalizeEmail($request->header('X-Customer-Email', ''));

        if (!$token || !$email) {
            return response()->json(['message' => 'Customer OTP authentication is required.'], 401);
        }

        $payload = Cache::get($this->tokenCacheKey($token));

        if (!$payload || empty($payload['email'])) {
            return response()->json(['message' => 'Customer session is invalid or expired.'], 401);
        }

        $tokenEmail = $this->normalizeEmail((string) $payload['email']);

        if ($tokenEmail !== $email) {
            return response()->json(['message' => 'Customer session does not match email.'], 401);
        }

        $request->attributes->set('customer_verified_email', $tokenEmail);

        return $next($request);
    }

    private function normalizeEmail(string $email): string
    {
        return strtolower(trim($email));
    }

    private function tokenCacheKey(string $token): string
    {
        return 'manage_booking_token:' . hash('sha256', $token);
    }
}

