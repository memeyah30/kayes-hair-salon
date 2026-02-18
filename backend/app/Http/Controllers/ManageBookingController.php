<?php

namespace App\Http\Controllers;

use App\Mail\CustomerOtpMail;
use App\Models\Appointment;
use App\Models\AppointmentRating;
use App\Models\CustomerOtp;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class ManageBookingController extends Controller
{
    private const OTP_EXPIRY_MINUTES = 10;
    private const OTP_MAX_ATTEMPTS = 5;
    private const TOKEN_EXPIRY_MINUTES = 60;

    public function sendOtp(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $email = $this->normalizeEmail($data['email']);

        // Prevent false success when mail is not actually deliverable.
        $mailDriver = (string) config('mail.default');
        if (in_array($mailDriver, ['log', 'array'], true)) {
            return response()->json([
                'message' => 'Email sending is not configured. Please set MAIL_MAILER=smtp and valid SMTP credentials in backend/.env.',
            ], 500);
        }
        if ($mailDriver === 'smtp') {
            $mailHost = (string) config('mail.mailers.smtp.host');
            $mailUser = (string) config('mail.mailers.smtp.username');
            $mailPass = (string) config('mail.mailers.smtp.password');
            $mailFrom = (string) config('mail.from.address');
            if (
                empty($mailHost) || empty($mailUser) || empty($mailPass) || empty($mailFrom) ||
                $mailUser === 'null' || $mailPass === 'null' || $mailFrom === 'null' ||
                $mailUser === 'your_gmail@gmail.com' || $mailPass === 'your_google_app_password'
            ) {
                return response()->json([
                    'message' => 'SMTP is incomplete. Set MAIL_HOST, MAIL_USERNAME, MAIL_PASSWORD, and MAIL_FROM_ADDRESS in backend/.env.',
                ], 500);
            }
        }

        $hasAppointment = Appointment::query()
            ->whereRaw('LOWER(customer_email) = ?', [$email])
            ->exists();

        if (!$hasAppointment) {
            return response()->json([
                'message' => 'No appointments found for this email.',
            ], 404);
        }

        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        CustomerOtp::query()
            ->where('email', $email)
            ->whereNull('used_at')
            ->update(['used_at' => now()]);

        CustomerOtp::create([
            'email' => $email,
            'otp_hash' => Hash::make($otp),
            'expires_at' => now()->addMinutes(self::OTP_EXPIRY_MINUTES),
            'attempts' => 0,
            'used_at' => null,
        ]);

        try {
            Mail::to($email)->send(new CustomerOtpMail($otp, self::OTP_EXPIRY_MINUTES));
        } catch (\Throwable $e) {
            $exceptionMessage = (string) $e->getMessage();
            $responseMessage = 'Failed to send OTP email. Check SMTP configuration.';
            if (
                str_contains($exceptionMessage, '535-5.7.8') ||
                str_contains($exceptionMessage, 'Username and Password not accepted')
            ) {
                $responseMessage = 'Gmail authentication failed. Use a Google App Password in MAIL_PASSWORD (not your Gmail account password).';
            }

            Log::error('Failed to send manage-booking OTP email', [
                'email' => $email,
                'mail_driver' => config('mail.default'),
                'mail_host' => config('mail.mailers.smtp.host'),
                'mail_port' => config('mail.mailers.smtp.port'),
                'exception' => $exceptionMessage,
            ]);
            return response()->json([
                'message' => $responseMessage,
            ], 500);
        }

        return response()->json([
            'message' => 'OTP sent successfully.',
        ]);
    }

    public function verifyOtp(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'otp' => ['required', 'digits:6'],
        ]);

        $email = $this->normalizeEmail($data['email']);
        $otpInput = (string) $data['otp'];

        $otpRow = CustomerOtp::query()
            ->where('email', $email)
            ->whereNull('used_at')
            ->latest('id')
            ->first();

        if (!$otpRow) {
            return response()->json([
                'message' => 'OTP is invalid or already used.',
            ], 422);
        }

        if ($otpRow->attempts >= self::OTP_MAX_ATTEMPTS) {
            return response()->json([
                'message' => 'Maximum OTP attempts reached. Request a new OTP.',
            ], 429);
        }

        if (Carbon::now()->greaterThan($otpRow->expires_at)) {
            return response()->json([
                'message' => 'OTP has expired. Request a new OTP.',
            ], 422);
        }

        if (!Hash::check($otpInput, $otpRow->otp_hash)) {
            $otpRow->increment('attempts');

            $remainingAttempts = max(0, self::OTP_MAX_ATTEMPTS - $otpRow->attempts);
            $statusCode = $remainingAttempts === 0 ? 429 : 422;

            return response()->json([
                'message' => $remainingAttempts === 0
                    ? 'Maximum OTP attempts reached. Request a new OTP.'
                    : 'Invalid OTP.',
                'remaining_attempts' => $remainingAttempts,
            ], $statusCode);
        }

        $otpRow->update([
            'used_at' => now(),
        ]);

        $token = Str::random(64);
        $expiresAt = now()->addMinutes(self::TOKEN_EXPIRY_MINUTES);

        Cache::put(
            $this->tokenCacheKey($token),
            ['email' => $email],
            $expiresAt
        );

        return response()->json([
            'message' => 'OTP verified successfully.',
            'token' => $token,
            'email' => $email,
            'expires_at' => $expiresAt->toIso8601String(),
        ]);
    }

    public function appointments(Request $request)
    {
        $email = $this->normalizeEmail((string) $request->attributes->get('customer_verified_email', ''));

        $appointments = Appointment::query()
            ->with(['service:id,name,price_cents', 'services:id,name,price_cents', 'stylist:id,name'])
            ->whereRaw('LOWER(customer_email) = ?', [$email])
            ->orderByDesc('start_datetime')
            ->get();

        $ratedIds = AppointmentRating::query()
            ->whereIn('appointment_id', $appointments->pluck('id'))
            ->pluck('appointment_id')
            ->flip();

        $response = $appointments->map(function (Appointment $appointment) use ($ratedIds) {
            $start = Carbon::parse($appointment->getRawOriginal('start_datetime'), 'UTC')->setTimezone('Asia/Manila');
            $isOutsideLockWindow = $start->greaterThan(Carbon::now('Asia/Manila')->addHours(3));
            $isModifiableStatus = in_array($appointment->status, ['booked', 'pending', 'confirmed'], true);
            $hasRating = $ratedIds->has($appointment->id);

            $totalAmountCents = (int) ($appointment->total_amount_cents ?? 0);
            if ($totalAmountCents <= 0) {
                if ($appointment->services->isNotEmpty()) {
                    $totalAmountCents = (int) $appointment->services->sum('price_cents');
                } else {
                    $totalAmountCents = (int) ($appointment->service?->price_cents ?? 0);
                }
            }

            $serviceName = $appointment->services->isNotEmpty()
                ? $appointment->services->pluck('name')->implode(', ')
                : ($appointment->service?->name ?? 'Service');

            return [
                'id' => $appointment->id,
                'service_name' => $serviceName,
                'stylist_name' => $appointment->stylist?->name ?? 'Stylist',
                'appointment_date' => $start->format('Y-m-d'),
                'appointment_time' => $start->format('H:i'),
                'status' => $this->mapStatusForCustomer((string) $appointment->status),
                'raw_status' => $appointment->status,
                'total_amount' => round($totalAmountCents / 100, 2),
                'total_amount_cents' => $totalAmountCents,
                'can_reschedule' => $isModifiableStatus && $isOutsideLockWindow,
                'can_cancel' => $isModifiableStatus && $isOutsideLockWindow,
                'can_rate' => $appointment->status === 'completed' && !$hasRating,
            ];
        });

        return response()->json([
            'appointments' => $response,
        ]);
    }

    public function reschedule(Request $request, int $id)
    {
        $data = $request->validate([
            'appointment_date' => ['required_without:date', 'date_format:Y-m-d'],
            'date' => ['required_without:appointment_date', 'date_format:Y-m-d'],
            'appointment_time' => ['required_without:time', 'date_format:H:i'],
            'time' => ['required_without:appointment_time', 'date_format:H:i'],
        ]);

        $email = $this->normalizeEmail((string) $request->attributes->get('customer_verified_email', ''));
        $appointment = $this->findOwnedAppointment($id, $email);

        if (!$appointment) {
            return response()->json(['message' => 'Appointment not found.'], 404);
        }

        if (!$this->canModifyAppointment($appointment)) {
            return response()->json([
                'message' => 'Reschedule is only allowed for pending/confirmed bookings at least 3 hours before the appointment.',
            ], 422);
        }

        $date = $data['appointment_date'] ?? $data['date'];
        $time = $data['appointment_time'] ?? $data['time'];
        $newStartManila = Carbon::createFromFormat('Y-m-d H:i', "{$date} {$time}", 'Asia/Manila');

        if (!$newStartManila || $newStartManila->lessThanOrEqualTo(Carbon::now('Asia/Manila')->addHours(3))) {
            return response()->json([
                'message' => 'New appointment time must be at least 3 hours from now.',
            ], 422);
        }

        $hour = (int) $newStartManila->format('H');
        if ($hour < 8 || $hour >= 20) {
            return response()->json([
                'message' => 'Appointment time must be between 08:00 and 19:59.',
            ], 422);
        }

        $currentStartUtc = Carbon::parse($appointment->getRawOriginal('start_datetime'), 'UTC');
        $currentEndUtc = Carbon::parse($appointment->getRawOriginal('end_datetime'), 'UTC');
        $durationMinutes = max(15, $currentStartUtc->diffInMinutes($currentEndUtc));

        $newStartUtc = $newStartManila->copy()->setTimezone('UTC');
        $newEndUtc = $newStartUtc->copy()->addMinutes($durationMinutes);

        $hasConflict = Appointment::query()
            ->where('id', '!=', $appointment->id)
            ->where('stylist_id', $appointment->stylist_id)
            ->whereIn('status', ['booked', 'pending', 'confirmed'])
            ->where(function ($query) use ($newStartUtc, $newEndUtc) {
                $query->where('start_datetime', '<', $newEndUtc)
                    ->where('end_datetime', '>', $newStartUtc);
            })
            ->exists();

        if ($hasConflict) {
            return response()->json([
                'message' => 'Selected time is unavailable. Please choose another time.',
            ], 409);
        }

        $appointment->update([
            'start_datetime' => $newStartUtc,
            'end_datetime' => $newEndUtc,
            'rescheduled_at' => now(),
            'rescheduled_by_type' => 'customer',
            'reschedule_reason' => 'Customer self-service reschedule',
        ]);

        return response()->json([
            'message' => 'Appointment rescheduled successfully.',
        ]);
    }

    public function cancel(Request $request, int $id)
    {
        $email = $this->normalizeEmail((string) $request->attributes->get('customer_verified_email', ''));
        $appointment = $this->findOwnedAppointment($id, $email);

        if (!$appointment) {
            return response()->json(['message' => 'Appointment not found.'], 404);
        }

        if (!$this->canModifyAppointment($appointment)) {
            return response()->json([
                'message' => 'Cancel is only allowed for pending/confirmed bookings at least 3 hours before the appointment.',
            ], 422);
        }

        $appointment->update([
            'status' => 'cancelled',
        ]);

        return response()->json([
            'message' => 'Appointment cancelled successfully.',
        ]);
    }

    public function rate(Request $request, int $id)
    {
        $data = $request->validate([
            'service_rating' => ['required', 'integer', 'min:1', 'max:5'],
            'stylist_rating' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string'],
        ]);

        $email = $this->normalizeEmail((string) $request->attributes->get('customer_verified_email', ''));
        $appointment = $this->findOwnedAppointment($id, $email);

        if (!$appointment) {
            return response()->json(['message' => 'Appointment not found.'], 404);
        }

        if ($appointment->status !== 'completed') {
            return response()->json([
                'message' => 'Only completed appointments can be rated.',
            ], 422);
        }

        $alreadyRated = AppointmentRating::query()
            ->where('appointment_id', $appointment->id)
            ->exists();

        if ($alreadyRated) {
            return response()->json([
                'message' => 'This appointment has already been rated.',
            ], 422);
        }

        $rating = AppointmentRating::create([
            'appointment_id' => $appointment->id,
            'customer_email' => $email,
            'service_rating' => (int) $data['service_rating'],
            'stylist_rating' => (int) $data['stylist_rating'],
            'comment' => $data['comment'] ?? null,
        ]);

        return response()->json([
            'message' => 'Rating submitted successfully.',
            'rating' => $rating,
        ], 201);
    }

    private function normalizeEmail(string $email): string
    {
        return strtolower(trim($email));
    }

    private function tokenCacheKey(string $token): string
    {
        return 'manage_booking_token:' . hash('sha256', $token);
    }

    private function findOwnedAppointment(int $id, string $email): ?Appointment
    {
        return Appointment::query()
            ->where('id', $id)
            ->whereRaw('LOWER(customer_email) = ?', [$email])
            ->first();
    }

    private function canModifyAppointment(Appointment $appointment): bool
    {
        $modifiableStatus = in_array($appointment->status, ['booked', 'pending', 'confirmed'], true);
        if (!$modifiableStatus) {
            return false;
        }

        $start = Carbon::parse($appointment->getRawOriginal('start_datetime'), 'UTC')
            ->setTimezone('Asia/Manila');

        return $start->greaterThan(Carbon::now('Asia/Manila')->addHours(3));
    }

    private function mapStatusForCustomer(string $status): string
    {
        return $status === 'booked' ? 'pending' : $status;
    }
}
