<?php

namespace App\Http\Controllers;

use App\Mail\AppointmentMagicLinkMail;
use App\Http\Controllers\Concerns\InteractsWithPagination;
use App\Models\Admin;
use App\Models\Appointment;
use App\Models\Manager;
use App\Models\Notification;
use App\Models\Service;
use App\Models\Stylist;
use App\Models\Holiday;
use App\Services\InventoryWorkflowService;
use App\Services\MissedAppointmentService;
use App\Services\Scheduler;
use App\Services\CustomerProfileService;
use App\Services\AppointmentNotificationService;
use App\Support\UploadStorage;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class AppointmentController extends Controller
{
    use InteractsWithPagination;

    private const SLOT_INTERVAL_MINUTES = 30;
    private const MAX_SLOTS_PER_TIME = 5;
    private const BUSINESS_OPEN_HOUR = 8;
    private const BUSINESS_CLOSE_HOUR = 20;
    private const ACTIVE_SLOT_STATUSES = ['booked', 'pending', 'confirmed'];
    private const BOOKING_SUBMISSION_PROCESSING_TTL_SECONDS = 45;
    private const BOOKING_SUBMISSION_RESULT_TTL_SECONDS = 90;

    /**
     * Format appointment datetime fields to Asia/Manila timezone for JSON response
     */
    private function formatAppointmentForResponse($appointment)
    {
        // Let the Appointment model serialize its casted datetimes in Asia/Manila.
        // We only add a lightweight flag here to avoid double-shifting timestamps.
        $appointment->is_rescheduled = !empty($appointment->getRawOriginal('rescheduled_at'));

        return $appointment;
    }

    private function resetNotificationStateOnRebooking(array $payload): array
    {
        if (($payload['status'] ?? null) !== 'booked') {
            return $payload;
        }

        $payload['approval_email_sent_at'] = null;
        $payload['reminder_sent_at'] = null;

        return $payload;
    }

    public function availability(Request $request)
    {
        $data = $request->validate([
            'date' => 'required|date',
            'service_duration' => 'nullable|integer|min:30',
            'exclude_appointment_id' => 'nullable|integer|exists:appointments,id',
        ]);

        $date = Carbon::parse($data['date'], 'Asia/Manila')->format('Y-m-d');
        if (Holiday::findClosedForDate($date)) {
            return response()->json([]);
        }

        $durationMinutes = $this->normalizeDurationMinutes($data['service_duration'] ?? self::SLOT_INTERVAL_MINUTES);
        $appointments = $this->activeCapacityAppointments($date, $data['exclude_appointment_id'] ?? null);
        $window = $this->businessWindow($date);
        $cursor = $window['start']->copy();
        $latestStart = $window['end']->copy()->subMinutes($durationMinutes);
        $slots = [];

        while ($cursor->lte($latestStart)) {
            $slotEnd = $cursor->copy()->addMinutes($durationMinutes);
            $capacity = $this->summarizeSlotCapacity($appointments, $cursor, $slotEnd);

            $slots[] = [
                'start' => $cursor->copy()->toIso8601String(),
                'end' => $slotEnd->copy()->toIso8601String(),
                'available' => !$capacity['full'],
                'booked_count' => $capacity['booked'],
                'remaining_slots' => $capacity['remaining'],
                'capacity' => self::MAX_SLOTS_PER_TIME,
            ];

            $cursor->addMinutes(self::SLOT_INTERVAL_MINUTES);
        }

        return response()->json($slots);
    }
    
    public function index(Request $request)
    {
        $this->syncMissedAppointments();

        $data = $request->validate([
            'status' => 'nullable|string',
            'service_id' => 'nullable|integer|exists:services,id',
            'q' => 'nullable|string',
            'start_date' => 'nullable|date_format:Y-m-d',
            'end_date' => 'nullable|date_format:Y-m-d',
            'per_page' => 'nullable|integer|min:1|max:100',
            'page' => 'nullable|integer|min:1',
            'paginate' => 'nullable',
        ]);

        $query = Appointment::with(['stylist', 'service', 'services.variants']);

        if (!empty($data['status']) && $data['status'] !== 'all') {
            $status = strtolower(trim((string) $data['status']));
            if ($status === 'booked') {
                $query->whereIn('status', ['booked', 'confirmed']);
            } else {
                $query->where('status', $status);
            }
        }

        if (!empty($data['service_id'])) {
            $serviceId = (int) $data['service_id'];
            $query->where(function ($builder) use ($serviceId) {
                $builder
                    ->where('service_id', $serviceId)
                    ->orWhereHas('services', function ($servicesQuery) use ($serviceId) {
                        $servicesQuery->where('services.id', $serviceId);
                    });
            });
        }

        if (!empty($data['q'])) {
            $search = strtolower(trim((string) $data['q']));
            $like = '%' . $search . '%';

            $query->where(function ($builder) use ($like) {
                $builder
                    ->whereRaw('LOWER(customer_name) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(COALESCE(customer_email, "")) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(COALESCE(customer_phone, "")) LIKE ?', [$like])
                    ->orWhereHas('service', function ($serviceQuery) use ($like) {
                        $serviceQuery->whereRaw('LOWER(name) LIKE ?', [$like]);
                    })
                    ->orWhereHas('services', function ($serviceQuery) use ($like) {
                        $serviceQuery->whereRaw('LOWER(name) LIKE ?', [$like]);
                    });
            });
        }

        if (!empty($data['start_date']) || !empty($data['end_date'])) {
            $timezone = 'Asia/Manila';
            $startManila = !empty($data['start_date'])
                ? Carbon::createFromFormat('Y-m-d', $data['start_date'], $timezone)->startOfDay()
                : Carbon::createFromFormat('Y-m-d', $data['end_date'], $timezone)->startOfDay();
            $endManila = !empty($data['end_date'])
                ? Carbon::createFromFormat('Y-m-d', $data['end_date'], $timezone)->endOfDay()
                : Carbon::createFromFormat('Y-m-d', $data['start_date'], $timezone)->endOfDay();

            if ($endManila->lt($startManila)) {
                [$startManila, $endManila] = [$endManila->copy()->startOfDay(), $startManila->copy()->endOfDay()];
            }

            $query->whereBetween('start_datetime', [
                $startManila->copy()->setTimezone('UTC'),
                $endManila->copy()->setTimezone('UTC'),
            ]);
        }

        if ($this->shouldPaginate($request)) {
            $paginator = $query
                ->orderBy('created_at')
                ->orderBy('id')
                ->paginate($this->resolvePerPage($request));
            $paginator->through(function ($appointment) {
                return $this->formatAppointmentForResponse($appointment);
            });

            return response()->json($paginator);
        }

        $appointments = $query->latest('start_datetime')->get();

        return $appointments->map(function ($appointment) {
            return $this->formatAppointmentForResponse($appointment);
        });
    }

    public function show(Appointment $appointment)
    {
        $appointment = $this->refreshMissedStatus($appointment);
        $appointment = $appointment->load(['stylist', 'service', 'services.variants']);
        return $this->formatAppointmentForResponse($appointment);
    }

    public function store(Request $request, Scheduler $scheduler, CustomerProfileService $customerProfiles)
    {
        $data = $request->validate([
            'customer_name' => 'required|string',
            'customer_email' => 'nullable|email',
            'customer_phone' => 'nullable|string',
            'customer_address' => 'nullable|string',
            'service_id' => 'nullable|exists:services,id', // Keep for backward compatibility
            'service_ids' => 'nullable|array', // New: array of service IDs
            'service_ids.*' => 'exists:services,id',
            'service_variants' => 'nullable|string', // JSON string of service_id => variant_id mapping
            'stylist_id' => 'nullable|exists:stylists,id',
            'auto_assigned_stylist_id' => 'nullable|exists:stylists,id',
            'date' => 'required|date',
            'preferred_time' => 'nullable|date_format:H:i',
            'payment_method' => 'nullable|in:on_hand,online',
            'payment_status' => 'nullable|in:unpaid,pending,paid,rejected,downpayment,refunded',
            'downpayment_amount_cents' => 'nullable|integer|min:0',
            'payment_proof_url' => 'nullable|url',
            'payment_proof' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120', // 5MB max
        ]);

        // Persist a reusable customer profile for future verified bookings
        // while keeping the existing appointment snapshot fields unchanged.
        $customer = !empty(trim((string) ($data['customer_email'] ?? '')))
            ? $customerProfiles->upsertCustomerFromBookingData([
                'customer_name' => $data['customer_name'],
                'customer_email' => $data['customer_email'],
                'customer_phone' => $data['customer_phone'] ?? null,
                'customer_address' => $data['customer_address'] ?? null,
            ])
            : null;

        // Validate date is today or future (use Asia/Manila timezone for Philippines)
        try {
            // Set timezone to Philippines (Asia/Manila)
            $timezone = 'Asia/Manila';
            
            // Parse the date string (YYYY-MM-DD format) - just compare date strings to avoid timezone issues
            $selectedDateStr = $data['date']; // Should already be in YYYY-MM-DD format
            $todayStr = Carbon::now($timezone)->format('Y-m-d');
            
            // Simple string comparison - this avoids all timezone issues
            if ($selectedDateStr < $todayStr) {
                return response()->json([
                    'message' => 'The date field must be a date after or equal to today.',
                    'errors' => [
                        'date' => ['The selected date must be today or a future date.']
                    ]
                ], 422);
            }
            
            // Store the parsed date for later use (in Philippines timezone)
            $selectedDate = Carbon::createFromFormat('Y-m-d', $selectedDateStr, $timezone)->startOfDay();
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Invalid date format.',
                'errors' => [
                    'date' => ['Please provide a valid date in YYYY-MM-DD format.']
                ]
            ], 422);
        }

        // Check if date is a holiday
        $date = $selectedDate->format('Y-m-d');
        $holiday = Holiday::findClosedForDate($date);
        if ($holiday) {
            return response()->json([
                'message' => "The salon is closed on {$holiday->name}. Please choose another date.",
                'holiday' => $holiday,
                'errors' => [
                    'date' => ["The salon is closed on {$holiday->name}."]
                ]
            ], 422);
        }

        // Support both single service_id (backward compatibility) and multiple service_ids
        $serviceIds = $data['service_ids'] ?? ($data['service_id'] ? [$data['service_id']] : []);
        
        if (empty($serviceIds)) {
            return response()->json(['message' => 'At least one service is required'], 422);
        }

        $serviceIds = array_values(array_map('intval', $serviceIds));
        sort($serviceIds);

        // Validate time is between 8 AM and 7:59 PM (business hours: 8 AM - 8 PM)
        if ($data['preferred_time']) {
            $time = \Carbon\Carbon::createFromFormat('H:i', $data['preferred_time']);
            $hour = (int)$time->format('H');
            // Allow hours 8-19 (8:00 AM to 7:59 PM) to ensure appointment can complete by 8 PM
            if ($hour < 8 || $hour >= 20) {
                return response()->json(['message' => 'Appointment time must be between 8:00 AM and 7:59 PM'], 422);
            }
        }

        // Load all services with variants
        $services = Service::with('variants')->whereIn('id', $serviceIds)->get();
        if ($services->count() !== count($serviceIds)) {
            return response()->json(['message' => 'One or more services not found'], 422);
        }

        // Get service variants mapping from request (can be JSON string or array)
        $serviceVariants = [];
        if (isset($data['service_variants'])) {
            if (is_string($data['service_variants'])) {
                $serviceVariants = json_decode($data['service_variants'], true) ?? [];
            } else {
                $serviceVariants = $data['service_variants'];
            }
        }

        $submissionCacheKey = $this->resolveBookingSubmissionCacheKey($request, $data, $serviceIds, $serviceVariants);
        $processedSubmissionKey = $submissionCacheKey ? "{$submissionCacheKey}:appointment" : null;
        $processingSubmissionKey = $submissionCacheKey ? "{$submissionCacheKey}:processing" : null;

        if ($duplicateAppointment = $this->findProcessedAppointmentFromCache($processedSubmissionKey)) {
            return $this->bookingStoreResponse($duplicateAppointment);
        }

        if ($processingSubmissionKey && !Cache::add(
            $processingSubmissionKey,
            true,
            now()->addSeconds(self::BOOKING_SUBMISSION_PROCESSING_TTL_SECONDS)
        )) {
            if ($duplicateAppointment = $this->findProcessedAppointmentFromCache($processedSubmissionKey)) {
                return $this->bookingStoreResponse($duplicateAppointment);
            }

            return response()->json([
                'message' => 'This booking is already being processed. Please wait a moment.',
            ], 409);
        }

        try {
            // Calculate total amount using variant prices if selected, otherwise service prices
            $totalAmountCents = 0;
            $servicesWithVariants = [];
            foreach ($services as $service) {
                $variantId = $serviceVariants[$service->id] ?? null;
                if ($variantId && $service->variants) {
                    $variant = $service->variants->find($variantId);
                    if ($variant) {
                        $totalAmountCents += $variant->price_cents;
                        $servicesWithVariants[$service->id] = $variant->id;
                    } else {
                        $totalAmountCents += $service->price_cents;
                    }
                } else {
                    $totalAmountCents += $service->price_cents;
                }
            }

            // Handle payment proof file upload
            $paymentProofUrl = $data['payment_proof_url'] ?? null;
            if ($request->hasFile('payment_proof')) {
                $path = UploadStorage::store($request->file('payment_proof'), 'payment-proofs');
                $paymentProofUrl = UploadStorage::url($path);
            }

            $paymentMethod = $data['payment_method'] ?? 'on_hand';
            $downpaymentAmountCents = $data['downpayment_amount_cents'] ?? null;
            $minDownpaymentCents = (int) round($totalAmountCents * 0.1);

            if ($downpaymentAmountCents !== null && (int) $downpaymentAmountCents > $totalAmountCents) {
                return response()->json([
                    'message' => 'Amount paid cannot be greater than the total amount.',
                    'errors' => [
                        'downpayment_amount_cents' => [
                            'Amount paid cannot be greater than the total amount.',
                        ],
                    ],
                ], 422);
            }

            // Validate payment for online payments
            if ($paymentMethod === 'online') {
                if (empty($downpaymentAmountCents) || $downpaymentAmountCents <= 0) {
                    return response()->json(['message' => 'Payment amount is required for online payments'], 422);
                }
                if (empty($paymentProofUrl)) {
                    return response()->json(['message' => 'Payment proof is required for online payments'], 422);
                }
            }

            // Validate deposit for pay-on-hand payments
            if ($paymentMethod === 'on_hand') {
                if (empty($downpaymentAmountCents) || $downpaymentAmountCents < $minDownpaymentCents) {
                    return response()->json([
                        'message' => 'A cash deposit is required to confirm this appointment.',
                        'errors' => [
                            'downpayment_amount_cents' => [
                                'Minimum deposit is 10% of the total amount.'
                            ]
                        ]
                    ], 422);
                }
            }

            $totalDuration = $this->normalizeDurationMinutes($services->count() * self::SLOT_INTERVAL_MINUTES);
            $slot = null;

            if (!empty($data['preferred_time'])) {
                $slot = $this->validateCapacitySlot($data['date'], $data['preferred_time'], $totalDuration);

                if (!$slot['available']) {
                    return response()->json([
                        'message' => 'This time slot is already fully booked. Please select another time.',
                        'errors' => [
                            'time' => ['This time slot is already fully booked. Please select another time.'],
                        ],
                        'slot' => [
                            'booked_count' => $slot['booked_count'],
                            'remaining_slots' => $slot['remaining_slots'],
                            'capacity' => $slot['capacity'],
                        ],
                    ], 409);
                }
            } else {
                $slot = $this->firstAvailableCapacitySlot($data['date'], $totalDuration);
            }

            if (!$slot) {
                return response()->json([
                    'message' => 'No available time slots for this date. Please choose a different date or time.',
                ], 409);
            }

            $startDateTimeForStorage = $slot['start']->copy()->setTimezone('UTC');
            $endDateTimeForStorage = $slot['end']->copy()->setTimezone('UTC');

            // Create appointment with first service_id for backward compatibility
            $paymentStatus = 'unpaid';
            if ($paymentMethod === 'online') {
                $paymentStatus = 'pending';
            } elseif (!empty($downpaymentAmountCents)) {
                $paymentStatus = $downpaymentAmountCents >= $totalAmountCents ? 'paid' : 'downpayment';
            }

            $appointment = DB::transaction(function () use (
                $customer,
                $data,
                $services,
                $paymentMethod,
                $paymentStatus,
                $downpaymentAmountCents,
                $totalAmountCents,
                $paymentProofUrl,
                $startDateTimeForStorage,
                $endDateTimeForStorage,
                $serviceIds,
                $servicesWithVariants
            ) {
                $appointment = Appointment::create([
                    'stylist_id' => null,
                    'service_id' => $services->first()->id, // Keep for backward compatibility
                    'customer_name' => $customer->name ?? $data['customer_name'],
                    'customer_email' => $customer->email ?? ($data['customer_email'] ?? null),
                    'customer_phone' => $customer->phone ?? ($data['customer_phone'] ?? null),
                    'customer_address' => $customer->address ?? ($data['customer_address'] ?? null),
                    'payment_method' => $paymentMethod,
                    'payment_status' => $paymentStatus,
                    'downpayment_amount_cents' => $downpaymentAmountCents ?? null,
                    'total_amount_cents' => $totalAmountCents,
                    'payment_proof_url' => $paymentProofUrl,
                    'start_datetime' => $startDateTimeForStorage,
                    'end_datetime' => $endDateTimeForStorage,
                ]);

                // Attach all services to the appointment with variant information.
                foreach ($serviceIds as $serviceId) {
                    $variantId = $servicesWithVariants[$serviceId] ?? null;
                    $appointment->services()->attach($serviceId, [
                        'service_variant_id' => $variantId,
                    ]);
                }

                return $appointment;
            });

            if ($processedSubmissionKey) {
                Cache::put(
                    $processedSubmissionKey,
                    $appointment->id,
                    now()->addSeconds(self::BOOKING_SUBMISSION_RESULT_TTL_SECONDS)
                );
            }

            $this->createNewAppointmentNotifications($appointment);

            return $this->bookingStoreResponse($appointment);
        } finally {
            if ($processingSubmissionKey) {
                Cache::forget($processingSubmissionKey);
            }
        }
    }

    public function update(Request $request, Appointment $appointment, Scheduler $scheduler, CustomerProfileService $customerProfiles)
    {
        $appointment = $this->refreshMissedStatus($appointment);
        if ($this->isMissed($appointment)) {
            return response()->json([
                'message' => 'Missed appointments are closed and can no longer be modified.',
            ], 422);
        }

        $data = $request->validate([
            'date' => 'sometimes|date|after_or_equal:today',
            'preferred_time' => 'nullable|date_format:H:i',
            'customer_name' => 'sometimes|string',
            'customer_email' => 'nullable|email',
            'customer_phone' => 'nullable|string',
            'customer_address' => 'nullable|string',
            'payment_status' => 'sometimes|in:unpaid,pending,paid,rejected,downpayment,refunded',
            'reschedule_reason' => 'nullable|string',
        ]);

        $user = $request->user();
        $isReschedule = isset($data['date']) || isset($data['preferred_time']);

        if ($isReschedule) {
            $timezone = 'Asia/Manila';
            $currentStartManila = Carbon::parse($appointment->getRawOriginal('start_datetime'), 'UTC')->setTimezone($timezone);
            $currentEndManila = Carbon::parse($appointment->getRawOriginal('end_datetime'), 'UTC')->setTimezone($timezone);

            $targetDate = isset($data['date'])
                ? Carbon::parse($data['date'], $timezone)->format('Y-m-d')
                : $currentStartManila->format('Y-m-d');

            // Check if date is a holiday
            $date = $targetDate;
            $holiday = Holiday::findClosedForDate($date);
            if ($holiday) {
                return response()->json([
                    'message' => "The salon is closed on {$holiday->name}. Please choose another date.",
                    'holiday' => $holiday
                ], 422);
            }

            // Validate time is between 8 AM and 7:59 PM (business hours: 8 AM - 8 PM)
            $targetTime = isset($data['preferred_time'])
                ? $data['preferred_time']
                : $currentStartManila->format('H:i');

            if ($targetTime) {
                $time = Carbon::createFromFormat('H:i', $targetTime, $timezone);
                $hour = (int)$time->format('H');
                if ($hour < 8 || $hour >= 20) {
                    return response()->json(['message' => 'Appointment time must be between 8:00 AM and 7:59 PM'], 422);
                }
            }

            $services = $appointment->services;
            if ($services->isEmpty() && $appointment->service) {
                $services = collect([$appointment->service]);
            }
            $stylist = $appointment->stylist;
            $durationMinutes = max(
                15,
                Carbon::parse($appointment->getRawOriginal('start_datetime'), 'UTC')
                    ->diffInMinutes(Carbon::parse($appointment->getRawOriginal('end_datetime'), 'UTC'))
            );
            if ($durationMinutes < 15) {
                $durationMinutes = $this->normalizeDurationMinutes($services->count() * self::SLOT_INTERVAL_MINUTES);
            }

            if (isset($data['date']) && isset($data['preferred_time'])) {
                $newStartManila = Carbon::createFromFormat('Y-m-d H:i', "{$targetDate} {$targetTime}", $timezone);
                $newEndManila = $newStartManila->copy()->addMinutes($durationMinutes);

                $newStartUtc = $newStartManila->copy()->setTimezone('UTC');
                $newEndUtc = $newEndManila->copy()->setTimezone('UTC');

                if ($stylist) {
                    $hasConflict = Appointment::query()
                        ->where('id', '!=', $appointment->id)
                        ->where('stylist_id', $stylist->id)
                        ->whereIn('status', self::ACTIVE_SLOT_STATUSES)
                        ->where(function ($query) use ($newStartUtc, $newEndUtc) {
                            $query->where('start_datetime', '<', $newEndUtc)
                                ->where('end_datetime', '>', $newStartUtc);
                        })
                        ->exists();

                    if ($hasConflict) {
                        return response()->json(['message' => 'Selected time is unavailable. Please choose another time.'], 409);
                    }
                } else {
                    $capacitySlot = $this->validateCapacitySlot(
                        $targetDate,
                        $targetTime,
                        $durationMinutes,
                        $appointment->id
                    );

                    if (!$capacitySlot['available']) {
                        return response()->json([
                            'message' => 'This time slot is already fully booked. Please select another time.',
                        ], 409);
                    }
                }

                $updateData = $this->resetNotificationStateOnRebooking([
                    'start_datetime' => $newStartUtc,
                    'end_datetime' => $newEndUtc,
                    'status' => 'booked',
                    'rescheduled_at' => now(),
                    'rescheduled_by_id' => $user ? $user->id : null,
                    'rescheduled_by_type' => $user ? get_class($user) : null,
                    'reschedule_reason' => $data['reschedule_reason'] ?? null,
                ]);
            } else {
                $slot = $stylist
                    ? $scheduler->findSlotForServices($stylist, $services->all(), $targetDate, $targetTime)
                    : $this->firstAvailableCapacitySlot($targetDate, $durationMinutes, $appointment->id);

                if (!$slot) {
                    return response()->json(['message' => 'No slots available'], 409);
                }

                $slotStartUtc = ($slot['start'] instanceof Carbon
                    ? $slot['start']->copy()
                    : Carbon::parse($slot['start'], $timezone))
                    ->setTimezone('UTC');
                $slotEndUtc = ($slot['end'] instanceof Carbon
                    ? $slot['end']->copy()
                    : Carbon::parse($slot['end'], $timezone))
                    ->setTimezone('UTC');

                $updateData = $this->resetNotificationStateOnRebooking([
                    'start_datetime' => $slotStartUtc,
                    'end_datetime' => $slotEndUtc,
                    'status' => 'booked',
                    'rescheduled_at' => now(),
                    'rescheduled_by_id' => $user ? $user->id : null,
                    'rescheduled_by_type' => $user ? get_class($user) : null,
                    'reschedule_reason' => $data['reschedule_reason'] ?? null,
                ]);
            }
        } else {
            $updateData = [];
        }

        $hasCustomerProfileChanges = isset($data['customer_name'])
            || isset($data['customer_email'])
            || isset($data['customer_phone'])
            || array_key_exists('customer_address', $data);

        if ($hasCustomerProfileChanges) {
            $resolvedEmail = trim((string) ($data['customer_email'] ?? $appointment->customer_email));

            if ($resolvedEmail !== '') {
                $customer = $customerProfiles->upsertCustomerFromBookingData([
                    'customer_name' => $data['customer_name'] ?? $appointment->customer_name,
                    'customer_email' => $resolvedEmail,
                    'customer_phone' => $data['customer_phone'] ?? $appointment->customer_phone,
                    'customer_address' => array_key_exists('customer_address', $data)
                        ? $data['customer_address']
                        : $appointment->customer_address,
                ]);

                $updateData['customer_name'] = $customer->name ?? ($data['customer_name'] ?? $appointment->customer_name);
                $updateData['customer_email'] = $customer->email;
                $updateData['customer_phone'] = $customer->phone;
                $updateData['customer_address'] = $customer->address;
            } else {
                if (isset($data['customer_name'])) $updateData['customer_name'] = $data['customer_name'];
                if (isset($data['customer_email'])) $updateData['customer_email'] = $data['customer_email'];
                if (isset($data['customer_phone'])) $updateData['customer_phone'] = $data['customer_phone'];
                if (array_key_exists('customer_address', $data)) $updateData['customer_address'] = $data['customer_address'];
            }
        }

        if (isset($data['payment_status'])) $updateData['payment_status'] = $data['payment_status'];

        $appointment->update($updateData);

        $appointment = $appointment->fresh()->load('stylist', 'service', 'services.variants');
        return $this->formatAppointmentForResponse($appointment);
    }

    public function cancel(Appointment $appointment)
    {
        return response()->json([
            'message' => 'Only customers can cancel appointments through the Manage Booking verification flow.',
        ], 403);
    }

    public function complete(Appointment $appointment, Request $request, InventoryWorkflowService $inventoryWorkflowService)
    {
        $appointment = $this->refreshMissedStatus($appointment);
        if ($this->isMissed($appointment)) {
            return response()->json([
                'message' => 'Missed appointments are closed and can no longer be completed.',
            ], 422);
        }

        // Check if appointment is already completed to avoid duplicate sales or stock deduction.
        if ($appointment->status === 'completed') {
            $appointment = $appointment->fresh()->load(['stylist', 'service', 'services.variants']);
            return $this->formatAppointmentForResponse($appointment);
        }

        // Determine sale payment method mapping
        $paymentMethodMap = [
            'on_hand' => 'cash',
            'online' => 'gcash',
            'gcash' => 'gcash',
            'cash' => 'cash',
        ];
        $salePaymentMethod = $paymentMethodMap[$appointment->payment_method] ?? 'cash';

        // For on-hand payments, mark as paid upon completion
        // Admin/manager completing an appointment means service is done and payment is settled.
        $newPaymentStatus = 'paid';

        try {
            DB::transaction(function () use (
                $appointment,
                $request,
                $inventoryWorkflowService,
                $newPaymentStatus,
                $salePaymentMethod
            ) {
                // Update appointment status
                $appointment->update([
                    'status' => 'completed',
                    'payment_status' => $newPaymentStatus,
                ]);

                // Refresh appointment to get updated status
                $appointment->refresh();

                // Load appointment with all relationships
                $appointment->load(['stylist', 'service', 'services.variants']);

                // Create sales records for each service in the appointment
                $appointmentServices = $appointment->services->count() > 0
                    ? $appointment->services
                    : ($appointment->service ? collect([$appointment->service]) : collect());

                $salePaymentStatus = $appointment->payment_status === 'paid' ? 'paid' : 'pending';

                foreach ($appointmentServices as $service) {
                    // Get the variant if one was selected
                    $variantId = $service->pivot?->service_variant_id;
                    $variant = null;
                    $serviceName = $service->name;
                    $servicePrice = $service->price_cents;

                    if ($variantId && $service->variants) {
                        $variant = $service->variants->find($variantId);
                        if ($variant) {
                            $serviceName = $service->name . ' - ' . $variant->name;
                            $servicePrice = $variant->price_cents;
                        }
                    }

                    // Check if a sale record already exists for this appointment and service
                    $existingSale = \App\Models\Sale::where('appointment_id', $appointment->id)
                        ->where('item_name', $serviceName)
                        ->first();

                    if (!$existingSale) {
                        \App\Models\Sale::create([
                            'appointment_id' => $appointment->id,
                            'inventory_id' => null, // Services don't have inventory
                            'transaction_type' => 'service',
                            'item_name' => $serviceName,
                            'quantity' => 1,
                            'unit_price_cents' => $servicePrice,
                            'total_amount_cents' => $servicePrice,
                            'payment_method' => $salePaymentMethod,
                            'payment_status' => $salePaymentStatus,
                            'customer_name' => $appointment->customer_name,
                            'customer_phone' => $appointment->customer_phone,
                            'stylist_id' => $appointment->stylist_id,
                            'notes' => 'Completed appointment service',
                        ]);
                    }
                }

                // Deduct inventory based on service-product mapping.
                $inventoryWorkflowService->deductForCompletedAppointment(
                    $appointment,
                    $appointmentServices,
                    $request->user()?->id
                );
            });
        } catch (\RuntimeException $e) {
            if ((int) $e->getCode() === 422) {
                return response()->json([
                    'message' => $e->getMessage(),
                ], 422);
            }

            Log::error('Failed to complete appointment with inventory deduction', [
                'appointment_id' => $appointment->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to complete appointment.',
            ], 500);
        } catch (\Throwable $e) {
            Log::error('Unexpected error while completing appointment', [
                'appointment_id' => $appointment->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to complete appointment.',
            ], 500);
        }

        $customerEmail = strtolower(trim((string) ($appointment->customer_email ?? '')));
        if ($customerEmail !== '') {
            $alreadyHasManageLink = $appointment->appointmentLinks()
                ->where('purpose', 'manage')
                ->exists();

            if (!$alreadyHasManageLink) {
                $rawToken = Str::random(64);

                $appointment->appointmentLinks()->create([
                    'token_hash' => hash('sha256', $rawToken),
                    'expires_at' => now()->addDays(7),
                    'used_at' => null,
                    'purpose' => 'manage',
                ]);
                $appointmentId = $appointment->id;
                $magicLinkUrl = route('customer.magic', ['token' => $rawToken]);

                app()->terminating(function () use ($appointmentId, $customerEmail, $magicLinkUrl) {
                    try {
                        $appointmentForMail = Appointment::with(['service', 'services'])->find($appointmentId);
                        if (!$appointmentForMail) {
                            return;
                        }

                        Mail::to($customerEmail)->send(
                            new AppointmentMagicLinkMail($appointmentForMail, $magicLinkUrl)
                        );
                    } catch (\Throwable $e) {
                        Log::error('Failed to send appointment magic link email', [
                            'appointment_id' => $appointmentId,
                            'customer_email' => $customerEmail,
                            'error' => $e->getMessage(),
                        ]);
                    }
                });
            }
        }

        return $this->formatAppointmentForResponse(
            $appointment->fresh()->load(['stylist', 'service', 'services.variants'])
        );
    }

    public function confirm(Appointment $appointment, AppointmentNotificationService $appointmentNotifications)
    {
        $appointment = $this->refreshMissedStatus($appointment);
        if ($this->isMissed($appointment)) {
            return response()->json([
                'message' => 'Missed appointments are closed and can no longer be confirmed.',
            ], 422);
        }

        if ($appointment->payment_method === 'on_hand') {
            $totalAmountCents = (int) ($appointment->total_amount_cents ?? 0);
            $minDeposit = (int) round($totalAmountCents * 0.2);
            $deposit = (int) ($appointment->downpayment_amount_cents ?? 0);
            if ($deposit < $minDeposit) {
                return response()->json([
                    'message' => 'Deposit required before confirming this appointment.'
                ], 422);
            }
        }

        $wasConfirmed = strtolower((string) ($appointment->status ?? '')) === 'confirmed';
        $updateData = ['status' => 'confirmed'];

        // Confirmation means payment proof/deposit has been validated, so do not keep "pending".
        if (strtolower((string) ($appointment->payment_status ?? '')) === 'pending') {
            $total = (int) ($appointment->total_amount_cents ?? 0);
            $deposit = (int) ($appointment->downpayment_amount_cents ?? 0);

            if ($deposit <= 0) {
                $updateData['payment_status'] = 'unpaid';
            } elseif ($total > 0 && $deposit >= $total) {
                $updateData['payment_status'] = 'paid';
            } else {
                $updateData['payment_status'] = 'downpayment';
            }
        }

        $appointment->update($updateData);
        $appointment = $appointment->fresh()->load(['stylist', 'service', 'services.variants']);

        if (!$wasConfirmed || !$appointment->approval_email_sent_at) {
            try {
                $appointmentNotifications->sendApprovalEmail($appointment);
                $appointment->refresh();
            } catch (\Throwable $e) {
                Log::error('Failed to send appointment approval email', [
                    'appointment_id' => $appointment->id,
                    'customer_email' => $appointment->customer_email,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $appointment->load(['stylist', 'service', 'services.variants']);
    }

    public function receipt(Appointment $appointment)
    {
        $appointment = $this->refreshMissedStatus($appointment);
        $appointment->load(['stylist', 'service', 'services.variants']);
        $appointment = $this->formatAppointmentForResponse($appointment);
    
        return response()->json([
            'appointment' => $appointment,
            'receipt_number' => 'APT-' . str_pad($appointment->id, 6, '0', STR_PAD_LEFT),
            'booking_date' => $appointment->created_at->copy()->timezone('Asia/Manila')->format('Y-m-d h:i:s A'),
        ]);
    }

    public function qrCode(Appointment $appointment, AppointmentNotificationService $appointmentNotifications)
    {
        $svg = $appointmentNotifications->qrCodeSvg($appointment);

        return response($svg, 200, [
            'Content-Type' => 'image/svg+xml; charset=UTF-8',
            'Cache-Control' => 'public, max-age=3600',
            'Content-Disposition' => 'inline; filename="appointment-' . $appointment->id . '-qr.svg"',
        ]);
    }
    

    public function reschedule(Request $request, Appointment $appointment, Scheduler $scheduler)
    {
        $appointment = $this->refreshMissedStatus($appointment);
        if ($this->isMissed($appointment)) {
            return response()->json([
                'message' => 'Missed appointments are closed and can no longer be rescheduled.',
            ], 422);
        }

        $data = $request->validate([
            'date' => 'required|date|after_or_equal:today',
            'preferred_time' => 'nullable|date_format:H:i',
            'reschedule_reason' => 'nullable|string',
        ]);

        $timezone = 'Asia/Manila';

        // Check if date is a holiday
        $date = Carbon::parse($data['date'], $timezone)->format('Y-m-d');
        $holiday = Holiday::findClosedForDate($date);
        if ($holiday) {
            return response()->json([
                'message' => "The salon is closed on {$holiday->name}. Please choose another date.",
                'holiday' => $holiday
            ], 422);
        }

        // Validate time is between 8 AM and 7:59 PM
        if ($data['preferred_time']) {
            $time = Carbon::createFromFormat('H:i', $data['preferred_time'], $timezone);
            $hour = (int)$time->format('H');
            if ($hour < 8 || $hour >= 20) {
                return response()->json(['message' => 'Appointment time must be between 8:00 AM and 7:59 PM'], 422);
            }
        }

        $services = $appointment->services;
        if ($services->isEmpty() && $appointment->service) {
            $services = collect([$appointment->service]);
        }
        $stylist = $appointment->stylist;
        $user = $request->user();
        $durationMinutes = max(
            15,
            Carbon::parse($appointment->getRawOriginal('start_datetime'), 'UTC')
                ->diffInMinutes(Carbon::parse($appointment->getRawOriginal('end_datetime'), 'UTC'))
        );
        if ($durationMinutes < 15) {
            $durationMinutes = $this->normalizeDurationMinutes($services->count() * self::SLOT_INTERVAL_MINUTES);
        }

        if (!empty($data['preferred_time'])) {
            $newStartManila = Carbon::createFromFormat('Y-m-d H:i', "{$date} {$data['preferred_time']}", $timezone);
            $newEndManila = $newStartManila->copy()->addMinutes($durationMinutes);
            $newStartUtc = $newStartManila->copy()->setTimezone('UTC');
            $newEndUtc = $newEndManila->copy()->setTimezone('UTC');

            if ($stylist) {
                $hasConflict = Appointment::query()
                    ->where('id', '!=', $appointment->id)
                    ->where('stylist_id', $stylist->id)
                    ->whereIn('status', self::ACTIVE_SLOT_STATUSES)
                    ->where(function ($query) use ($newStartUtc, $newEndUtc) {
                        $query->where('start_datetime', '<', $newEndUtc)
                            ->where('end_datetime', '>', $newStartUtc);
                    })
                    ->exists();

                if ($hasConflict) {
                    return response()->json(['message' => 'Selected time is unavailable. Please choose another time.'], 409);
                }
            } else {
                $capacitySlot = $this->validateCapacitySlot(
                    $date,
                    $data['preferred_time'],
                    $durationMinutes,
                    $appointment->id
                );

                if (!$capacitySlot['available']) {
                    return response()->json([
                        'message' => 'This time slot is already fully booked. Please select another time.',
                    ], 409);
                }
            }

            $updatePayload = $this->resetNotificationStateOnRebooking([
                'start_datetime' => $newStartUtc,
                'end_datetime' => $newEndUtc,
                'status' => 'booked',
                'rescheduled_at' => now(),
                'rescheduled_by_id' => $user ? $user->id : null,
                'rescheduled_by_type' => $user ? get_class($user) : null,
                'reschedule_reason' => $data['reschedule_reason'] ?? null,
            ]);
        } else {
            $slot = $stylist
                ? $scheduler->findSlotForServices($stylist, $services->all(), $date, $data['preferred_time'] ?? null)
                : $this->firstAvailableCapacitySlot($date, $durationMinutes, $appointment->id);

            if (!$slot) {
                return response()->json(['message' => 'No slots available'], 409);
            }

            $updatePayload = $this->resetNotificationStateOnRebooking([
                'start_datetime' => ($slot['start'] instanceof Carbon
                    ? $slot['start']->copy()
                    : Carbon::parse($slot['start'], $timezone))->setTimezone('UTC'),
                'end_datetime' => ($slot['end'] instanceof Carbon
                    ? $slot['end']->copy()
                    : Carbon::parse($slot['end'], $timezone))->setTimezone('UTC'),
                'status' => 'booked',
                'rescheduled_at' => now(),
                'rescheduled_by_id' => $user ? $user->id : null,
                'rescheduled_by_type' => $user ? get_class($user) : null,
                'reschedule_reason' => $data['reschedule_reason'] ?? null,
            ]);
        }

        $appointment->update($updatePayload);

        $appointment = $appointment->fresh()->load('stylist', 'service', 'services.variants');
        $appointment = $this->formatAppointmentForResponse($appointment);
        return response()->json([
            'message' => 'Appointment rescheduled successfully',
            'appointment' => $appointment
        ]);
    }

    public function markMissed(Appointment $appointment)
    {
        $appointment = $this->refreshMissedStatus($appointment);
        if (in_array($appointment->status, ['completed', 'cancelled'], true)) {
            return response()->json([
                'message' => 'Completed or cancelled appointments cannot be marked as missed.',
            ], 422);
        }

        $appointment->update(['status' => 'missed']);
        return response()->json(['message' => 'Appointment marked as missed']);
    }

    public function history(Request $request)
    {
        $this->syncMissedAppointments();
        $query = Appointment::with(['stylist', 'service', 'services']);

        // Filter by status if provided
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Include missed appointments
        if ($request->has('include_missed')) {
            // Already included in all statuses
        }

        // Filter by stylist if user is a stylist
        $user = $request->user();
        if ($user instanceof \App\Models\Stylist) {
            $query->where('stylist_id', $user->id);
        }

        return $query->latest('start_datetime')->get();
    }

    public function destroy(Appointment $appointment)
    {
        $appointment->delete();
        return response()->json(['message' => 'Appointment deleted successfully']);
    }

    private function normalizeDurationMinutes(int $durationMinutes): int
    {
        $normalized = max(self::SLOT_INTERVAL_MINUTES, $durationMinutes);

        if ($normalized % self::SLOT_INTERVAL_MINUTES !== 0) {
            $normalized = (int) (ceil($normalized / self::SLOT_INTERVAL_MINUTES) * self::SLOT_INTERVAL_MINUTES);
        }

        return $normalized;
    }

    private function resolveBookingSubmissionCacheKey(
        Request $request,
        array $data,
        array $serviceIds,
        array $serviceVariants
    ): string {
        $requestId = trim((string) $request->header('X-Booking-Request-Id', ''));
        if ($requestId !== '') {
            return 'appointment_submission:' . hash('sha256', $requestId);
        }

        ksort($serviceVariants);

        $fingerprint = [
            'customer_name' => strtolower(trim((string) ($data['customer_name'] ?? ''))),
            'customer_email' => strtolower(trim((string) ($data['customer_email'] ?? ''))),
            'customer_phone' => preg_replace('/[\s-]+/', '', (string) ($data['customer_phone'] ?? '')),
            'date' => (string) ($data['date'] ?? ''),
            'preferred_time' => (string) ($data['preferred_time'] ?? ''),
            'payment_method' => (string) ($data['payment_method'] ?? ''),
            'downpayment_amount_cents' => (int) ($data['downpayment_amount_cents'] ?? 0),
            'service_ids' => array_values($serviceIds),
            'service_variants' => $serviceVariants,
        ];

        return 'appointment_submission:fingerprint:' . hash('sha256', json_encode($fingerprint));
    }

    private function findProcessedAppointmentFromCache(?string $processedSubmissionKey): ?Appointment
    {
        if (!$processedSubmissionKey) {
            return null;
        }

        $appointmentId = Cache::get($processedSubmissionKey);
        if (!$appointmentId) {
            return null;
        }

        $appointment = Appointment::query()->find($appointmentId);
        if (!$appointment) {
            Cache::forget($processedSubmissionKey);
            return null;
        }

        return $appointment;
    }

    private function bookingStoreResponse(Appointment $appointment)
    {
        $appointment->loadMissing(['stylist', 'service', 'services.variants']);
        $appointment = $this->formatAppointmentForResponse($appointment);

        $response = $appointment->toArray();
        $customerEmail = strtolower(trim((string) ($appointment->customer_email ?? '')));

        if ($customerEmail !== '') {
            [$token, $expiresAt] = $this->issueManageBookingToken($customerEmail);

            $response['customer_manage_booking'] = [
                'email' => $customerEmail,
                'token' => $token,
                'expires_at' => $expiresAt->toIso8601String(),
            ];
        }

        return response()->json($response);
    }

    private function issueManageBookingToken(string $email): array
    {
        $token = Str::random(64);
        $expiresAt = now()->addHour();

        Cache::put(
            $this->manageBookingTokenCacheKey($token),
            [
                'email' => strtolower(trim($email)),
                'expires_at' => $expiresAt->toIso8601String(),
            ],
            $expiresAt
        );

        return [$token, $expiresAt];
    }

    private function manageBookingTokenCacheKey(string $token): string
    {
        return 'manage_booking_token:' . hash('sha256', $token);
    }

    private function createNewAppointmentNotifications(Appointment $appointment): void
    {
        try {
            $admins = Admin::query()
                ->select(['id'])
                ->get()
                ->map(fn (Admin $admin) => [
                    'recipient_type' => Admin::class,
                    'recipient_id' => $admin->id,
                ]);

            $managers = Manager::query()
                ->where('active', true)
                ->select(['id'])
                ->get()
                ->map(fn (Manager $manager) => [
                    'recipient_type' => Manager::class,
                    'recipient_id' => $manager->id,
                ]);

            $recipients = $admins->merge($managers)->values();
            if ($recipients->isEmpty()) {
                return;
            }

            $startDateTime = $appointment->getRawOriginal('start_datetime')
                ? Carbon::parse($appointment->getRawOriginal('start_datetime'), 'UTC')->setTimezone('Asia/Manila')
                : null;

            $scheduleLabel = $startDateTime
                ? $startDateTime->format('M j, Y \a\t g:i A') . ' PHT'
                : 'the selected schedule';

            $message = sprintf(
                '%s booked a new appointment for %s.',
                $appointment->customer_name ?: 'A customer',
                $scheduleLabel
            );

            $timestamp = now();

            Notification::query()->insert(
                $recipients->map(fn (array $recipient) => [
                    'recipient_type' => $recipient['recipient_type'],
                    'recipient_id' => $recipient['recipient_id'],
                    'appointment_id' => $appointment->id,
                    'title' => 'New Appointment Booked',
                    'message' => $message,
                    'is_read' => false,
                    'created_at' => $timestamp,
                    'updated_at' => $timestamp,
                ])->all()
            );
        } catch (\Throwable $exception) {
            Log::warning('Failed to create new appointment notifications.', [
                'appointment_id' => $appointment->id,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    private function syncMissedAppointments(): void
    {
        app(MissedAppointmentService::class)->markOverdueAppointmentsAsMissed();
    }

    private function refreshMissedStatus(Appointment $appointment): Appointment
    {
        return app(MissedAppointmentService::class)->refreshAppointmentStatus($appointment);
    }

    private function isMissed(Appointment $appointment): bool
    {
        return app(MissedAppointmentService::class)->isMissed($appointment);
    }

    private function businessWindow(string $date): array
    {
        $targetDate = Carbon::createFromFormat('Y-m-d', $date, 'Asia/Manila')->startOfDay();

        return [
            'start' => $targetDate->copy()->setTime(self::BUSINESS_OPEN_HOUR, 0, 0),
            'end' => $targetDate->copy()->setTime(self::BUSINESS_CLOSE_HOUR, 0, 0),
        ];
    }

    private function activeCapacityAppointments(string $date, ?int $ignoreAppointmentId = null): Collection
    {
        $window = $this->businessWindow($date);
        $businessStartUtc = $window['start']->copy()->setTimezone('UTC');
        $businessEndUtc = $window['end']->copy()->setTimezone('UTC');

        $query = Appointment::query()
            ->select(['id', 'start_datetime', 'end_datetime', 'status'])
            ->whereIn('status', self::ACTIVE_SLOT_STATUSES)
            ->where('start_datetime', '<', $businessEndUtc)
            ->where('end_datetime', '>', $businessStartUtc);

        if ($ignoreAppointmentId) {
            $query->where('id', '!=', $ignoreAppointmentId);
        }

        return $query->get()->map(function (Appointment $appointment) {
            return [
                'id' => $appointment->id,
                'start' => Carbon::parse($appointment->getRawOriginal('start_datetime'), 'UTC'),
                'end' => Carbon::parse($appointment->getRawOriginal('end_datetime'), 'UTC'),
            ];
        });
    }

    private function summarizeSlotCapacity(Collection $appointments, Carbon $slotStart, Carbon $slotEnd): array
    {
        $blockStartUtc = $slotStart->copy()->setTimezone('UTC');
        $blockEndUtc = $slotStart->copy()->addMinutes(self::SLOT_INTERVAL_MINUTES)->setTimezone('UTC');

        // Slot occupancy is based only on the exact start slot the customer chose,
        // not on later blocks covered by the appointment duration.
        $bookedCount = $appointments->filter(function (array $appointment) use ($blockStartUtc, $blockEndUtc) {
            return $appointment['start']->gte($blockStartUtc) && $appointment['start']->lt($blockEndUtc);
        })->count();

        return [
            'booked' => $bookedCount,
            'remaining' => max(0, self::MAX_SLOTS_PER_TIME - $bookedCount),
            'full' => $bookedCount >= self::MAX_SLOTS_PER_TIME,
        ];
    }

    private function firstAvailableCapacitySlot(
        string $date,
        int $durationMinutes,
        ?int $ignoreAppointmentId = null
    ): ?array {
        $appointments = $this->activeCapacityAppointments($date, $ignoreAppointmentId);
        $window = $this->businessWindow($date);
        $cursor = $window['start']->copy();
        $latestStart = $window['end']->copy()->subMinutes($durationMinutes);

        while ($cursor->lte($latestStart)) {
            $slotEnd = $cursor->copy()->addMinutes($durationMinutes);
            $capacity = $this->summarizeSlotCapacity($appointments, $cursor, $slotEnd);

            if (!$capacity['full']) {
                return [
                    'start' => $cursor->copy(),
                    'end' => $slotEnd->copy(),
                    'booked_count' => $capacity['booked'],
                    'remaining_slots' => $capacity['remaining'],
                    'capacity' => self::MAX_SLOTS_PER_TIME,
                ];
            }

            $cursor->addMinutes(self::SLOT_INTERVAL_MINUTES);
        }

        return null;
    }

    private function validateCapacitySlot(
        string $date,
        string $preferredTime,
        int $durationMinutes,
        ?int $ignoreAppointmentId = null
    ): array {
        $slotStart = Carbon::createFromFormat('Y-m-d H:i', "{$date} {$preferredTime}", 'Asia/Manila');
        $slotEnd = $slotStart->copy()->addMinutes($durationMinutes);
        $window = $this->businessWindow($date);

        if ($slotStart->lt($window['start']) || $slotEnd->gt($window['end'])) {
            return [
                'available' => false,
                'start' => $slotStart,
                'end' => $slotEnd,
                'booked_count' => self::MAX_SLOTS_PER_TIME,
                'remaining_slots' => 0,
                'capacity' => self::MAX_SLOTS_PER_TIME,
            ];
        }

        $appointments = $this->activeCapacityAppointments($date, $ignoreAppointmentId);
        $capacity = $this->summarizeSlotCapacity($appointments, $slotStart, $slotEnd);

        return [
            'available' => !$capacity['full'],
            'start' => $slotStart,
            'end' => $slotEnd,
            'booked_count' => $capacity['booked'],
            'remaining_slots' => $capacity['remaining'],
            'capacity' => self::MAX_SLOTS_PER_TIME,
        ];
    }

    private function resolveBookingStylist(
        ?int $selectedStylistId,
        ?int $preferredAutoAssignedStylistId,
        $services,
        string $date,
        ?string $preferredTime,
        int $totalDurationMinutes,
        Scheduler $scheduler
    ): ?Stylist {
        if ($selectedStylistId) {
            return Stylist::findOrFail($selectedStylistId);
        }

        $candidateStylists = $this->resolveAutoAssignCandidates();
        if ($candidateStylists->isEmpty()) {
            return null;
        }

        if ($preferredTime) {
            $candidateStylists = $candidateStylists
                ->filter(fn (Stylist $stylist) => $this->stylistCanTakeRequestedSlot(
                    $stylist,
                    $date,
                    $preferredTime,
                    $totalDurationMinutes,
                    $scheduler
                ))
                ->values();
        } else {
            $candidateStylists = $candidateStylists
                ->filter(fn (Stylist $stylist) => (bool) $scheduler->findSlotForServices(
                    $stylist,
                    $services->all(),
                    $date,
                    null
                ))
                ->values();
        }

        if ($candidateStylists->isEmpty()) {
            return null;
        }

        if ($preferredAutoAssignedStylistId) {
            $preferredStylist = $candidateStylists->firstWhere('id', $preferredAutoAssignedStylistId);
            if ($preferredStylist) {
                return $preferredStylist;
            }
        }

        return $this->pickAutoAssignedStylist($candidateStylists, $date);
    }

    private function resolveAutoAssignCandidates()
    {
        return Stylist::query()
            ->where('active', true)
            ->where(function ($query) {
                $query->where('role', 'stylist')
                    ->orWhereNull('role');
            })
            ->get()
            ->values();
    }

    private function stylistCanTakeRequestedSlot(
        Stylist $stylist,
        string $date,
        string $preferredTime,
        int $totalDurationMinutes,
        Scheduler $scheduler
    ): bool {
        $timezone = 'Asia/Manila';
        $requestedStart = Carbon::createFromFormat('Y-m-d H:i', "{$date} {$preferredTime}", $timezone);
        $requestedEnd = $requestedStart->copy()->addMinutes($totalDurationMinutes);

        return $scheduler->freeBlocksForDate($stylist, $date)->contains(function ($block) use ($requestedStart, $requestedEnd) {
            return $requestedStart->greaterThanOrEqualTo($block['start'])
                && $requestedEnd->lessThanOrEqualTo($block['end']);
        });
    }

    private function pickAutoAssignedStylist($stylists, string $date): Stylist
    {
        if ($stylists->count() === 1) {
            return $stylists->first();
        }

        $timezone = 'Asia/Manila';
        $dayStartUtc = Carbon::createFromFormat('Y-m-d', $date, $timezone)->startOfDay()->setTimezone('UTC');
        $dayEndUtc = Carbon::createFromFormat('Y-m-d', $date, $timezone)->endOfDay()->setTimezone('UTC');

        $bookingCounts = Appointment::query()
            ->selectRaw('stylist_id, COUNT(*) as total')
            ->whereIn('stylist_id', $stylists->pluck('id'))
            ->where('status', 'booked')
            ->whereBetween('start_datetime', [$dayStartUtc, $dayEndUtc])
            ->groupBy('stylist_id')
            ->pluck('total', 'stylist_id');

        $lowestCount = $stylists->map(fn (Stylist $stylist) => (int) ($bookingCounts[$stylist->id] ?? 0))->min();

        // Rotate auto-assigned bookings among currently available stylists instead of
        // repeatedly defaulting to the same first stylist. Stylists within one booking
        // of the lightest load join the rotation pool, then one is picked at random.
        $rotationPool = $stylists
            ->filter(fn (Stylist $stylist) => (int) ($bookingCounts[$stylist->id] ?? 0) <= ($lowestCount + 1))
            ->values();

        if ($rotationPool->isEmpty()) {
            $rotationPool = $stylists->values();
        }

        return $rotationPool->shuffle()->first();
    }
}
