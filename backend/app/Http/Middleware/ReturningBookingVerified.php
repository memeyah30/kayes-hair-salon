<?php

namespace App\Http\Middleware;

use App\Services\CustomerOtpSessionService;
use App\Services\ReturningBookingSessionService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ReturningBookingVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        $customerOtpSessions = app(CustomerOtpSessionService::class);
        $headerEmail = $this->normalizeEmail($request->header('X-Customer-Email', ''));

        if ($customerOtpSessions->isVerified($request)) {
            $sessionEmail = $customerOtpSessions->email($request);

            if ($headerEmail && $sessionEmail !== $headerEmail) {
                return response()->json(['message' => 'Returning booking session does not match email.'], 401);
            }

            $request->attributes->set('customer_booking_verified_email', $sessionEmail);

            return $next($request);
        }

        $token = $request->bearerToken() ?: $request->header('X-Returning-Booking-Token');
        $email = $headerEmail;

        if (!$token || !$email) {
            return response()->json(['message' => 'Returning customer verification is required.'], 401);
        }

        $payload = app(ReturningBookingSessionService::class)->getPayload($token);

        if (!$payload || empty($payload['email'])) {
            return response()->json(['message' => 'Returning booking session is invalid or expired.'], 401);
        }

        $tokenEmail = $this->normalizeEmail((string) $payload['email']);

        if ($tokenEmail !== $email) {
            return response()->json(['message' => 'Returning booking session does not match email.'], 401);
        }

        $request->attributes->set('customer_booking_verified_email', $tokenEmail);

        return $next($request);
    }

    private function normalizeEmail(string $email): string
    {
        return strtolower(trim($email));
    }
}
