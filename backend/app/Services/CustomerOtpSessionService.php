<?php

namespace App\Services;

use Illuminate\Http\Request;

class CustomerOtpSessionService
{
    public const VERIFIED_KEY = 'otp_verified';
    public const EMAIL_KEY = 'customer_email';
    public const CONTEXT_KEY = 'otp_context';

    public function store(Request $request, string $email, ?string $context = null): void
    {
        if (!$request->hasSession()) {
            return;
        }

        $request->session()->regenerate();
        $request->session()->put([
            self::VERIFIED_KEY => true,
            self::EMAIL_KEY => $this->normalizeEmail($email),
        ]);

        if ($context) {
            $request->session()->put(self::CONTEXT_KEY, $context);
        }
    }

    public function clear(Request $request): void
    {
        if (!$request->hasSession()) {
            return;
        }

        $request->session()->forget([
            self::VERIFIED_KEY,
            self::EMAIL_KEY,
            self::CONTEXT_KEY,
            'customer_manage_booking_email',
            'customer_appointment_id',
        ]);
    }

    public function isVerified(Request $request): bool
    {
        return $request->hasSession()
            && $request->session()->get(self::VERIFIED_KEY) === true
            && $this->email($request) !== '';
    }

    public function email(Request $request): string
    {
        if (!$request->hasSession()) {
            return '';
        }

        return $this->normalizeEmail((string) $request->session()->get(self::EMAIL_KEY, ''));
    }

    private function normalizeEmail(string $email): string
    {
        return strtolower(trim($email));
    }
}
