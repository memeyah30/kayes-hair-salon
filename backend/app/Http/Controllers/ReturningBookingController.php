<?php

namespace App\Http\Controllers;

use App\Mail\ReturningBookingOtpMail;
use App\Models\CustomerOtp;
use App\Services\CustomerProfileService;
use App\Services\ReturningBookingSessionService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ReturningBookingController extends Controller
{
    private const OTP_PURPOSE = 'returning_booking';
    private const OTP_EXPIRY_MINUTES = 10;
    private const OTP_MAX_ATTEMPTS = 5;
    private const TOKEN_EXPIRY_MINUTES = 60;

    public function checkEmail(Request $request, CustomerProfileService $customerProfiles)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $email = $customerProfiles->normalizeEmail($data['email']);

        if (!$customerProfiles->hasExistingCustomerData($email)) {
            return response()->json([
                'email' => $email,
                'exists' => false,
                'message' => 'No existing record found. Please fill out your information.',
            ]);
        }

        $this->sendOtpCode($email);

        return response()->json([
            'email' => $email,
            'exists' => true,
            'message' => 'Existing record found. Verification code sent to your email.',
        ]);
    }

    public function sendOtp(Request $request, CustomerProfileService $customerProfiles)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $email = $customerProfiles->normalizeEmail($data['email']);

        if (!$customerProfiles->hasExistingCustomerData($email)) {
            return response()->json([
                'message' => 'No existing record found. Please fill out your information.',
            ], 404);
        }

        $this->sendOtpCode($email);

        return response()->json([
            'message' => 'Existing record found. Verification code sent to your email.',
        ]);
    }

    public function verifyOtp(
        Request $request,
        CustomerProfileService $customerProfiles,
        ReturningBookingSessionService $bookingSessions
    ) {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'otp' => ['required', 'digits:6'],
        ]);

        $email = $customerProfiles->normalizeEmail($data['email']);
        $otpInput = (string) $data['otp'];

        $otpRow = CustomerOtp::query()
            ->where('email', $email)
            ->where('purpose', self::OTP_PURPOSE)
            ->whereNull('used_at')
            ->latest('id')
            ->first();

        if (!$otpRow) {
            return response()->json([
                'message' => 'Invalid or expired verification code.',
            ], 422);
        }

        if ($otpRow->attempts >= self::OTP_MAX_ATTEMPTS) {
            return response()->json([
                'message' => 'Maximum verification attempts reached. Request a new code.',
            ], 429);
        }

        if (Carbon::now()->greaterThan($otpRow->expires_at)) {
            return response()->json([
                'message' => 'Invalid or expired verification code.',
            ], 422);
        }

        if (!Hash::check($otpInput, $otpRow->otp_hash)) {
            $otpRow->increment('attempts');

            $remainingAttempts = max(0, self::OTP_MAX_ATTEMPTS - $otpRow->attempts);
            $statusCode = $remainingAttempts === 0 ? 429 : 422;

            return response()->json([
                'message' => $remainingAttempts === 0
                    ? 'Maximum verification attempts reached. Request a new code.'
                    : 'Invalid or expired verification code.',
                'remaining_attempts' => $remainingAttempts,
            ], $statusCode);
        }

        $otpRow->update([
            'used_at' => now(),
        ]);

        [$token, $expiresAt] = $bookingSessions->issueToken($email, self::TOKEN_EXPIRY_MINUTES);

        return response()->json([
            'message' => 'Verification successful. You may now continue booking.',
            'token' => $token,
            'email' => $email,
            'expires_at' => $expiresAt->toIso8601String(),
        ]);
    }

    public function profile(Request $request, CustomerProfileService $customerProfiles)
    {
        $email = $customerProfiles->normalizeEmail((string) $request->attributes->get('customer_booking_verified_email', ''));
        $customer = $customerProfiles->findOrCreateCustomerByEmail($email);

        if (!$customer) {
            return response()->json([
                'message' => 'Saved customer information could not be found for this email.',
            ], 404);
        }

        $customer = $customerProfiles->markVerified($customer);

        return response()->json([
            'customer' => $customerProfiles->profileData($customer),
            'missing_fields' => $customerProfiles->missingRequiredFields($customer),
            'is_complete' => $customerProfiles->isProfileComplete($customer),
        ]);
    }

    public function updateProfile(Request $request, CustomerProfileService $customerProfiles)
    {
        $email = $customerProfiles->normalizeEmail((string) $request->attributes->get('customer_booking_verified_email', ''));
        $customer = $customerProfiles->findOrCreateCustomerByEmail($email);

        if (!$customer) {
            return response()->json([
                'message' => 'Saved customer information could not be found for this email.',
            ], 404);
        }

        $data = $request->validate([
            'name' => ['required', 'string'],
            'phone' => ['required', 'string'],
            'address' => ['nullable', 'string'],
        ]);

        $customer = $customerProfiles->updateProfile($customer, $data);

        return response()->json([
            'message' => 'Customer information updated successfully.',
            'customer' => $customerProfiles->profileData($customer),
            'missing_fields' => $customerProfiles->missingRequiredFields($customer),
            'is_complete' => $customerProfiles->isProfileComplete($customer),
        ]);
    }

    private function sendOtpCode(string $email): void
    {
        $this->ensureMailIsConfigured();

        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        CustomerOtp::query()
            ->where('email', $email)
            ->where('purpose', self::OTP_PURPOSE)
            ->whereNull('used_at')
            ->update(['used_at' => now()]);

        CustomerOtp::create([
            'email' => $email,
            'purpose' => self::OTP_PURPOSE,
            'otp_hash' => Hash::make($otp),
            'expires_at' => now()->addMinutes(self::OTP_EXPIRY_MINUTES),
            'attempts' => 0,
            'used_at' => null,
        ]);

        try {
            Mail::to($email)->send(new ReturningBookingOtpMail($otp, self::OTP_EXPIRY_MINUTES));
        } catch (\Throwable $e) {
            $exceptionMessage = (string) $e->getMessage();
            $responseMessage = 'Failed to send verification code. Check SMTP configuration.';

            if (
                str_contains($exceptionMessage, '535-5.7.8')
                || str_contains($exceptionMessage, 'Username and Password not accepted')
            ) {
                $responseMessage = 'Gmail authentication failed. Use a Google App Password in MAIL_PASSWORD (not your Gmail account password).';
            }

            Log::error('Failed to send returning-booking OTP email', [
                'email' => $email,
                'mail_driver' => config('mail.default'),
                'mail_host' => config('mail.mailers.smtp.host'),
                'mail_port' => config('mail.mailers.smtp.port'),
                'exception' => $exceptionMessage,
            ]);

            throw \Illuminate\Validation\ValidationException::withMessages([
                'email' => [$responseMessage],
            ]);
        }
    }

    private function ensureMailIsConfigured(): void
    {
        $mailDriver = (string) config('mail.default');

        if (in_array($mailDriver, ['log', 'array'], true)) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'email' => ['Email sending is not configured. Please set MAIL_MAILER=smtp and valid SMTP credentials in backend/.env.'],
            ]);
        }

        if ($mailDriver !== 'smtp') {
            return;
        }

        $mailHost = (string) config('mail.mailers.smtp.host');
        $mailUser = (string) config('mail.mailers.smtp.username');
        $mailPass = (string) config('mail.mailers.smtp.password');
        $mailFrom = (string) config('mail.from.address');

        if (
            empty($mailHost) || empty($mailUser) || empty($mailPass) || empty($mailFrom) ||
            $mailUser === 'null' || $mailPass === 'null' || $mailFrom === 'null' ||
            $mailUser === 'your_gmail@gmail.com' || $mailPass === 'your_google_app_password'
        ) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'email' => ['SMTP is incomplete. Set MAIL_HOST, MAIL_USERNAME, MAIL_PASSWORD, and MAIL_FROM_ADDRESS in backend/.env.'],
            ]);
        }
    }
}
