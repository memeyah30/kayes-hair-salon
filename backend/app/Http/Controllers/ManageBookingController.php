<?php

namespace App\Http\Controllers;

use App\Mail\CustomerOtpMail;
use App\Models\Appointment;
use App\Models\AppointmentLink;
use App\Models\AppointmentRating;
use App\Models\CustomerRating;
use App\Models\CustomerOtp;
use App\Services\CustomerOtpSessionService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class ManageBookingController extends Controller
{
    private const OTP_PURPOSE = 'manage_booking';
    private const OTP_EXPIRY_MINUTES = 10;
    private const OTP_MAX_ATTEMPTS = 5;
    private const TOKEN_EXPIRY_MINUTES = 60;

    public function sendOtp(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $email = $this->normalizeEmail($data['email']);

        // Allow 'log' and 'array' drivers to be used for bypasses.
        $mailDriver = (string) config('mail.default');
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
            Mail::to($email)->send(new CustomerOtpMail($otp, self::OTP_EXPIRY_MINUTES));
        } catch (\Throwable $e) {
            $exceptionMessage = (string) $e->getMessage();
            $responseMessage = 'Failed to send OTP email. Check SMTP configuration. Error: ' . $exceptionMessage;
            if (
                str_contains($exceptionMessage, '535-5.7.8') ||
                str_contains($exceptionMessage, 'Username and Password not accepted')
            ) {
                $responseMessage = 'Gmail authentication failed. Use a Google App Password in MAIL_PASSWORD (not your Gmail account password).';
            }

            Log::error('Failed to send manage-booking OTP email', [
                'email' => $email,
                'error' => $exceptionMessage,
            ]);
            return response()->json([
                'message' => $responseMessage,
                'raw_error' => $exceptionMessage
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
            ->where('purpose', self::OTP_PURPOSE)
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

        app(CustomerOtpSessionService::class)->store($request, $email, self::OTP_PURPOSE);

        [$token, $expiresAt] = $this->issueManageBookingToken($email);

        return response()->json([
            'message' => 'OTP verified successfully.',
            'token' => $token,
            'email' => $email,
            'expires_at' => $expiresAt->toIso8601String(),
        ]);
    }

    public function magicLink(Request $request, string $token)
    {
        $tokenHash = hash('sha256', (string) $token);

        $link = AppointmentLink::query()
            ->with('appointment:id,customer_email')
            ->where('token_hash', $tokenHash)
            ->where('purpose', 'manage')
            ->first();

        if (
            !$link
            || Carbon::now()->greaterThan($link->expires_at)
            || !$link->appointment
            || empty($link->appointment->customer_email)
        ) {
            return redirect('/manage-booking/start?expired=1');
        }

        if ($link->used_at === null) {
            $link->update(['used_at' => now()]);
        }

        $email = $this->normalizeEmail((string) $link->appointment->customer_email);
        [$sessionToken] = $this->issueManageBookingToken($email);

        app(CustomerOtpSessionService::class)->store($request, $email, self::OTP_PURPOSE);
        $request->session()->put('customer_appointment_id', $link->appointment_id);
        $request->session()->put('customer_manage_booking_email', $email);

        $query = [
            'token' => $sessionToken,
            'email' => $email,
            'appointment_id' => $link->appointment_id,
        ];

        if ($request->has('view')) {
            $query['view'] = $request->get('view');
        }

        $frontendUrl = config('app.frontend_url');
        
        return redirect($frontendUrl . '/customer?' . http_build_query($query));
    }

    public function logout(Request $request)
    {
        app(CustomerOtpSessionService::class)->clear($request);

        return response()->json([
            'message' => 'Customer OTP session cleared successfully.',
        ]);
    }

    public function appointments(Request $request)
    {
        $this->syncMissedAppointments();
        $email = $this->normalizeEmail((string) $request->attributes->get('customer_verified_email', ''));

        $appointments = Appointment::query()
            ->with(['service.variants', 'services.variants', 'stylist:id,name'])
            ->whereRaw('LOWER(customer_email) = ?', [$email])
            ->orderByDesc('start_datetime')
            ->get();

        $appointmentIds = $appointments->pluck('id');
        $appointmentRatingsById = AppointmentRating::query()
            ->whereIn('appointment_id', $appointmentIds)
            ->get()
            ->keyBy('appointment_id');

        $customerRatingsById = CustomerRating::query()
            ->whereIn('appointment_id', $appointmentIds)
            ->get()
            ->keyBy('appointment_id');

        $ratedIds = $appointmentRatingsById
            ->keys()
            ->merge($customerRatingsById->keys())
            ->unique()
            ->flip();

        $response = $appointments->map(function (Appointment $appointment) use ($ratedIds, $appointmentRatingsById, $customerRatingsById) {
            $start = Carbon::parse($appointment->getRawOriginal('start_datetime'), 'UTC')->setTimezone('Asia/Manila');
            $rescheduledAt = $appointment->getRawOriginal('rescheduled_at');
            $isUpcoming = $start->greaterThan(Carbon::now('Asia/Manila'));
            $isModifiableStatus = in_array($appointment->status, ['booked', 'pending', 'confirmed'], true);
            $hasRating = $ratedIds->has($appointment->id);
            $ratingPayload = $this->buildRatingPayload(
                $appointmentRatingsById->get($appointment->id),
                $customerRatingsById->get($appointment->id)
            );

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
                'customer_name' => $appointment->customer_name,
                'customer_email' => $appointment->customer_email,
                'customer_phone' => $appointment->customer_phone,
                'customer_address' => $appointment->customer_address,
                'services' => $appointment->services,
                'service' => $appointment->service,
                'start_datetime' => $appointment->getRawOriginal('start_datetime'),
                'end_datetime' => $appointment->getRawOriginal('end_datetime'),
                'amount_paid_cents' => $appointment->amount_paid_cents,
                'downpayment_amount_cents' => $appointment->downpayment_amount_cents,
                'remaining_balance_cents' => $appointment->remaining_balance_cents,
                'payment_method' => $appointment->payment_method,
                'mode_of_payment' => $appointment->mode_of_payment,
                'service_name' => $serviceName,
                'stylist_name' => $appointment->stylist?->name ?? 'Stylist',
                'appointment_date' => $start->format('Y-m-d'),
                'appointment_time' => $start->format('H:i'),
                'status' => $this->mapStatusForCustomer((string) $appointment->status),
                'raw_status' => $appointment->status,
                'is_rescheduled' => !is_null($rescheduledAt),
                'rescheduled_at' => $rescheduledAt
                    ? Carbon::parse($rescheduledAt, 'UTC')->setTimezone('Asia/Manila')->toIso8601String()
                    : null,
                'rescheduled_by_type' => $appointment->rescheduled_by_type,
                'reschedule_reason' => $appointment->reschedule_reason,
                'total_amount' => round($totalAmountCents / 100, 2),
                'total_amount_cents' => $totalAmountCents,
                'can_reschedule' => $isModifiableStatus && $isUpcoming,
                'can_cancel' => $isModifiableStatus && $isUpcoming,
                'can_rate' => $appointment->status === 'completed' && !$hasRating,
                'rating' => $ratingPayload,
                'created_at' => $appointment->created_at
                    ? Carbon::parse($appointment->created_at, 'UTC')->setTimezone('Asia/Manila')->toIso8601String()
                    : null,
            ];
        });

        $ratings = $response
            ->filter(fn (array $appointment) => !empty($appointment['rating']))
            ->map(function (array $appointment) {
                return array_merge(
                    [
                        'appointment_id' => $appointment['id'],
                        'service_name' => $appointment['service_name'],
                        'stylist_name' => $appointment['stylist_name'],
                        'appointment_date' => $appointment['appointment_date'],
                        'appointment_time' => $appointment['appointment_time'],
                    ],
                    $appointment['rating']
                );
            })
            ->sortByDesc('rated_at')
            ->values();

        $customerName = $appointments
            ->map(fn (Appointment $appointment) => trim((string) $appointment->customer_name))
            ->first(fn (string $name) => $name !== '');

        return response()->json([
            'customer_name' => $customerName ?: null,
            'appointments' => $response->values(),
            'ratings' => $ratings,
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
                'message' => 'Reschedule is only allowed for upcoming booked, pending, or confirmed appointments.',
            ], 422);
        }

        $date = $data['appointment_date'] ?? $data['date'];
        $time = $data['appointment_time'] ?? $data['time'];
        $newStartManila = Carbon::createFromFormat('Y-m-d H:i', "{$date} {$time}", 'Asia/Manila');

        if (!$newStartManila || $newStartManila->lessThanOrEqualTo(Carbon::now('Asia/Manila')->addMinutes(30))) {
            return response()->json([
                'message' => 'New appointment time must be at least 30 minutes from now.',
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
                'message' => 'Cancel is only allowed for upcoming booked, pending, or confirmed appointments.',
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
            ->exists()
            || CustomerRating::query()
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

        $overallRating = (int) round((((int) $data['service_rating']) + ((int) $data['stylist_rating'])) / 2);

        CustomerRating::query()->updateOrCreate(
            ['appointment_id' => $appointment->id],
            [
                // Ratings should still work for completed appointments that remain unassigned.
                'stylist_id' => $appointment->stylist_id,
                'customer_name' => $appointment->customer_name,
                'customer_email' => $email,
                'rating' => max(1, min(5, $overallRating)),
                'comment' => $data['comment'] ?? null,
            ]
        );

        return response()->json([
            'message' => 'Rating submitted successfully.',
            'rating' => $rating,
        ], 201);
    }

    private function normalizeEmail(string $email): string
    {
        return strtolower(trim($email));
    }

    private function buildRatingPayload(?AppointmentRating $appointmentRating, ?CustomerRating $customerRating): ?array
    {
        if (!$appointmentRating && !$customerRating) {
            return null;
        }

        $serviceRating = $appointmentRating
            ? (int) $appointmentRating->service_rating
            : (int) ($customerRating?->rating ?? 0);
        $stylistRating = $appointmentRating
            ? (int) $appointmentRating->stylist_rating
            : (int) ($customerRating?->rating ?? 0);
        $overallRating = $customerRating
            ? (int) $customerRating->rating
            : (int) round(($serviceRating + $stylistRating) / 2);

        $ratedAt = $appointmentRating?->created_at ?? $customerRating?->created_at;

        return [
            'service_rating' => max(1, min(5, $serviceRating)),
            'stylist_rating' => max(1, min(5, $stylistRating)),
            'overall_rating' => max(1, min(5, $overallRating)),
            'comment' => $appointmentRating?->comment ?? $customerRating?->comment,
            'rated_at' => $ratedAt?->toIso8601String(),
        ];
    }

    private function tokenCacheKey(string $token): string
    {
        return 'manage_booking_token:' . hash('sha256', $token);
    }

    private function issueManageBookingToken(string $email): array
    {
        $token = Str::random(64);
        $expiresAt = now()->addMinutes(self::TOKEN_EXPIRY_MINUTES);

        Cache::put(
            $this->tokenCacheKey($token),
            ['email' => $email],
            $expiresAt
        );

        return [$token, $expiresAt];
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

        return $start->greaterThan(Carbon::now('Asia/Manila'));
    }

    private function mapStatusForCustomer(string $status): string
    {
        return $status === 'booked' ? 'pending' : $status;
    }

    private function syncMissedAppointments(): void
    {
        app(\App\Services\MissedAppointmentService::class)->markOverdueAppointmentsAsMissed();
    }
}
