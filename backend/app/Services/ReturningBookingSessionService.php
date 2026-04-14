<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class ReturningBookingSessionService
{
    public function issueToken(string $email, int $ttlMinutes = 60): array
    {
        $token = Str::random(64);
        $expiresAt = now()->addMinutes($ttlMinutes);

        Cache::put(
            $this->cacheKey($token),
            ['email' => strtolower(trim($email))],
            $expiresAt
        );

        return [$token, $expiresAt];
    }

    public function getPayload(string $token): ?array
    {
        $payload = Cache::get($this->cacheKey($token));

        return is_array($payload) ? $payload : null;
    }

    private function cacheKey(string $token): string
    {
        return 'returning_booking_token:' . hash('sha256', $token);
    }
}
