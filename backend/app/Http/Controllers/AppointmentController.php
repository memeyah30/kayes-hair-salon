<?php

namespace App\Http\Controllers;

use App\Mail\AppointmentMagicLinkMail;
use App\Models\Appointment;
use App\Models\Service;
use App\Models\Stylist;
use App\Models\Holiday;
use App\Services\Scheduler;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AppointmentController extends Controller
{
    /**
     * Format appointment datetime fields to Asia/Manila timezone for JSON response
     */
    private function formatAppointmentForResponse($appointment)
    {
        $tz = 'Asia/Manila';
    
        // Use raw values from DB - these are stored in UTC
        $rawStart = $appointment->getRawOriginal('start_datetime');
        if ($rawStart) {
            // Parse the raw datetime string from database (format: Y-m-d H:i:s, stored as UTC)
            // Create Carbon instance explicitly in UTC timezone
            $startCarbon = Carbon::createFromFormat('Y-m-d H:i:s', $rawStart, 'UTC')
                ->setTimezone($tz);
            // Return ISO 8601 string with timezone offset (e.g., "2026-02-05T16:00:00+08:00")
            $appointment->start_datetime = $startCarbon->format('Y-m-d\TH:i:sP');
            $appointment->start_datetime_pht = $startCarbon->format('Y-m-d\TH:i:sP');
        }
    
        $rawEnd = $appointment->getRawOriginal('end_datetime');
        if ($rawEnd) {
            // Parse the raw datetime string from database (format: Y-m-d H:i:s, stored as UTC)
            // Create Carbon instance explicitly in UTC timezone
            $endCarbon = Carbon::createFromFormat('Y-m-d H:i:s', $rawEnd, 'UTC')
                ->setTimezone($tz);
            // Return ISO 8601 string with timezone offset (e.g., "2026-02-05T16:30:00+08:00")
            $appointment->end_datetime = $endCarbon->format('Y-m-d\TH:i:sP');
            $appointment->end_datetime_pht = $endCarbon->format('Y-m-d\TH:i:sP');
        }
    
        return $appointment;
    }
    
    public function index()
    {
        $appointments = Appointment::with(['stylist', 'service', 'services.variants'])->latest('start_datetime')->get();
        
        // Format datetime fields to Asia/Manila timezone for JSON response
        return $appointments->map(function ($appointment) {
            return $this->formatAppointmentForResponse($appointment);
        });
    }

    public function show(Appointment $appointment)
    {
        $appointment = $appointment->load(['stylist', 'service', 'services.variants']);
        return $this->formatAppointmentForResponse($appointment);
    }

    public function store(Request $request, Scheduler $scheduler)
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
            'date' => 'required|date',
            'preferred_time' => 'nullable|date_format:H:i',
            'payment_method' => 'nullable|in:on_hand,online',
            'payment_status' => 'nullable|in:unpaid,pending,paid,rejected,downpayment,refunded',
            'downpayment_amount_cents' => 'nullable|integer|min:0',
            'payment_proof_url' => 'nullable|url',
            'payment_proof' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120', // 5MB max
        ]);

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
        $holiday = Holiday::where('date', $date)->where('is_closed', true)->first();
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
            $path = $request->file('payment_proof')->store('payment-proofs', 'public');
            $paymentProofUrl = Storage::url($path); // e.g. /storage/payment-proofs/filename.jpg
        }

        $paymentMethod = $data['payment_method'] ?? 'on_hand';
        $downpaymentAmountCents = $data['downpayment_amount_cents'] ?? null;
        $minDownpaymentCents = (int) round($totalAmountCents * 0.5);

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
                            'Minimum deposit is 50% of the total amount.'
                        ]
                    ]
                ], 422);
            }
        }

        $stylist = $data['stylist_id']
            ? Stylist::findOrFail($data['stylist_id'])
            : Stylist::where('active', true)->firstOrFail();

        // Use default duration of 30 minutes per service (since duration is removed)
        $defaultDurationMinutes = 30;
        $totalDuration = count($services) * $defaultDurationMinutes;

        // If preferred_time is provided, use it exactly (customer's exact selection)
        $timezone = 'Asia/Manila';
        $slot = null;
        
        if ($data['preferred_time']) {
            // Use the preferred time exactly as the customer selected it
            // Parse the time string (HH:MM format) - this is already in Asia/Manila timezone context
            $timeParts = explode(':', $data['preferred_time']);
            $hour = (int)$timeParts[0];
            $minute = (int)($timeParts[1] ?? 0);
            
            // Create the datetime in Asia/Manila timezone
            // First create in the specified timezone, then ensure it's set correctly
            $selectedDate = Carbon::createFromFormat('Y-m-d', $data['date'], $timezone)->startOfDay();
            // Create datetime in Asia/Manila timezone explicitly
            $preferredDateTime = Carbon::createFromFormat(
                'Y-m-d H:i:s',
                sprintf('%s %02d:%02d:00', $data['date'], $hour, $minute),
                $timezone
            );

            // #region agent log
            $logData = json_encode([
                'location' => 'AppointmentController.php:225',
                'message' => 'Preferred time parsed',
                'data' => [
                    'date' => $data['date'],
                    'preferred_time' => $data['preferred_time'],
                    'preferredDateTime' => $preferredDateTime->format('Y-m-d H:i:s'),
                    'preferredDateTimeTz' => $preferredDateTime->timezone->getName(),
                ],
                'timestamp' => time() * 1000,
                'sessionId' => 'debug-session',
                'runId' => 'run1',
                'hypothesisId' => 'T1'
            ]);
            file_put_contents('c:\\Users\\Ruffa Mae S. Sapan\\OneDrive\\Desktop\\THOLITS SALON\\.cursor\\debug.log', $logData . "\n", FILE_APPEND);
            // #endregion
            
            // Calculate end time based on number of services
            $defaultDurationMinutes = 30;
            $totalDuration = count($services) * $defaultDurationMinutes;
            
            $slot = [
                'start' => $preferredDateTime,
                'end' => $preferredDateTime->copy()->addMinutes($totalDuration)
            ];
            
            // Verify the slot is available (check for conflicts)
            $conflictingAppointment = Appointment::where('stylist_id', $stylist->id)
                ->where('status', 'booked')
                ->where(function($query) use ($slot) {
                    $query->whereBetween('start_datetime', [$slot['start'], $slot['end']])
                          ->orWhereBetween('end_datetime', [$slot['start'], $slot['end']])
                          ->orWhere(function($q) use ($slot) {
                              $q->where('start_datetime', '<=', $slot['start'])
                                ->where('end_datetime', '>=', $slot['end']);
                          });
                })
                ->first();
            
            if ($conflictingAppointment) {
                $overlapStart = Carbon::parse($conflictingAppointment->start_datetime)->setTimezone($timezone);
                $overlapEnd = Carbon::parse($conflictingAppointment->end_datetime)->setTimezone($timezone);
                return response()->json([
                    'message' => 'This time slot is already booked. The stylist has an appointment from ' . 
                                $overlapStart->format('g:i A') . ' to ' . $overlapEnd->format('g:i A') . 
                                '. Please choose a different time or stylist.',
                    'overlapping_appointment' => [
                        'start' => $conflictingAppointment->start_datetime,
                        'end' => $conflictingAppointment->end_datetime,
                    ]
                ], 409);
            }
        } else {
            // If no preferred time, use scheduler to find available slot
            $slot = $scheduler->findSlotForServices($stylist, $services->all(), $data['date'], null);
        }
        
        if (!$slot) {
            // Calculate total duration for error message
            $requestedStart = \Carbon\Carbon::parse($data['date'] . ' ' . ($data['preferred_time'] ?? '08:00'));
            $requestedEnd = $requestedStart->copy()->addMinutes($totalDuration);
            
            $overlapping = Appointment::where('stylist_id', $stylist->id)
                ->where('status', 'booked')
                ->where(function($query) use ($requestedStart, $requestedEnd) {
                    $query->whereBetween('start_datetime', [$requestedStart, $requestedEnd])
                          ->orWhereBetween('end_datetime', [$requestedStart, $requestedEnd])
                          ->orWhere(function($q) use ($requestedStart, $requestedEnd) {
                              $q->where('start_datetime', '<=', $requestedStart)
                                ->where('end_datetime', '>=', $requestedEnd);
                          });
                })
                ->first();
            
            if ($overlapping) {
                $overlapStart = \Carbon\Carbon::parse($overlapping->start_datetime);
                $overlapEnd = \Carbon\Carbon::parse($overlapping->end_datetime);
                return response()->json([
                    'message' => 'This time slot is already booked. The stylist has an appointment from ' . 
                                $overlapStart->format('g:i A') . ' to ' . $overlapEnd->format('g:i A') . 
                                '. Please choose a different time or stylist.',
                    'overlapping_appointment' => [
                        'start' => $overlapping->start_datetime,
                        'end' => $overlapping->end_datetime,
                    ]
                ], 409);
            }
            
            return response()->json([
                'message' => 'No available time slots for this date and stylist. Please choose a different date, time, or stylist.'
            ], 409);
        }

        // The slot should already be a Carbon instance in Asia/Manila timezone
        // from the preferred_time logic above (or from scheduler)
        $timezone = 'Asia/Manila';
        
        // Get the Carbon instances - they should already be in Asia/Manila
        if ($slot['start'] instanceof Carbon) {
            $startDateTime = $slot['start']->copy();
            // Ensure it's in Asia/Manila timezone (it should already be)
            if ($startDateTime->timezone->getName() !== $timezone) {
                $startDateTime->setTimezone($timezone);
            }
        } else {
            // Parse as string and assume it's in Asia/Manila timezone
            $startDateTime = Carbon::parse($slot['start'], $timezone);
        }
        
        if ($slot['end'] instanceof Carbon) {
            $endDateTime = $slot['end']->copy();
            if ($endDateTime->timezone->getName() !== $timezone) {
                $endDateTime->setTimezone($timezone);
            }
        } else {
            $endDateTime = Carbon::parse($slot['end'], $timezone);
        }

        // #region agent log
        $logData = json_encode([
            'location' => 'AppointmentController.php:331',
            'message' => 'Slot datetimes before storage conversion',
            'data' => [
                'startDateTime' => $startDateTime->format('Y-m-d H:i:s'),
                'startDateTimeTz' => $startDateTime->timezone->getName(),
                'endDateTime' => $endDateTime->format('Y-m-d H:i:s'),
                'endDateTimeTz' => $endDateTime->timezone->getName(),
            ],
            'timestamp' => time() * 1000,
            'sessionId' => 'debug-session',
            'runId' => 'run1',
            'hypothesisId' => 'T2'
        ]);
        file_put_contents('c:\\Users\\Ruffa Mae S. Sapan\\OneDrive\\Desktop\\THOLITS SALON\\.cursor\\debug.log', $logData . "\n", FILE_APPEND);
        // #endregion
        
        // Convert to UTC for database storage (Laravel stores datetimes in UTC)
        // This correctly converts the time: 4:00 PM Asia/Manila becomes 8:00 AM UTC
        // When retrieved later, we convert back to get 4:00 PM Asia/Manila
        // Ensure the datetime is in Manila timezone, then convert to UTC
        if ($startDateTime->timezone->getName() !== $timezone) {
            $startDateTime->setTimezone($timezone);
        }
        $startDateTimeForStorage = $startDateTime->copy()->setTimezone('UTC');
        
        if ($endDateTime->timezone->getName() !== $timezone) {
            $endDateTime->setTimezone($timezone);
        }
        $endDateTimeForStorage = $endDateTime->copy()->setTimezone('UTC');

        // #region agent log
        $logData = json_encode([
            'location' => 'AppointmentController.php:346',
            'message' => 'Datetimes converted to UTC for storage',
            'data' => [
                'startDateTimeUtc' => $startDateTimeForStorage->format('Y-m-d H:i:s'),
                'endDateTimeUtc' => $endDateTimeForStorage->format('Y-m-d H:i:s'),
            ],
            'timestamp' => time() * 1000,
            'sessionId' => 'debug-session',
            'runId' => 'run1',
            'hypothesisId' => 'T2'
        ]);
        file_put_contents('c:\\Users\\Ruffa Mae S. Sapan\\OneDrive\\Desktop\\THOLITS SALON\\.cursor\\debug.log', $logData . "\n", FILE_APPEND);
        // #endregion
        
        // Create appointment with first service_id for backward compatibility
        $paymentStatus = 'unpaid';
        if ($paymentMethod === 'online') {
            $paymentStatus = 'pending';
        } elseif (!empty($downpaymentAmountCents)) {
            $paymentStatus = $downpaymentAmountCents >= $totalAmountCents ? 'paid' : 'downpayment';
        }

        $appointment = Appointment::create([
            'stylist_id' => $stylist->id,
            'service_id' => $services->first()->id, // Keep for backward compatibility
            'customer_name' => $data['customer_name'],
            'customer_email' => $data['customer_email'] ?? null,
            'customer_phone' => $data['customer_phone'] ?? null,
            'customer_address' => $data['customer_address'] ?? null,
            'payment_method' => $paymentMethod,
            'payment_status' => $paymentStatus,
            'downpayment_amount_cents' => $downpaymentAmountCents ?? null,
            'total_amount_cents' => $totalAmountCents,
            'payment_proof_url' => $paymentProofUrl,
            'start_datetime' => $startDateTimeForStorage,
            'end_datetime' => $endDateTimeForStorage,
        ]);

        // Attach all services to the appointment with variant information
        // Always include service_variant_id (even if null) to ensure consistent column structure
        foreach ($serviceIds as $serviceId) {
            $variantId = $servicesWithVariants[$serviceId] ?? null;
            $appointment->services()->attach($serviceId, [
                'service_variant_id' => $variantId
            ]);
        }

        // Load relationships
        $appointment->load(['stylist', 'service', 'services.variants']);
        
        // Format datetime fields to Asia/Manila timezone for JSON response
        $appointment = $this->formatAppointmentForResponse($appointment);
        
        return response()->json($appointment);
    }

    public function update(Request $request, Appointment $appointment, Scheduler $scheduler)
    {
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
            $holiday = Holiday::where('date', $date)->where('is_closed', true)->first();
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

            if (isset($data['date']) && isset($data['preferred_time'])) {
                $durationMinutes = max(15, Carbon::parse($appointment->getRawOriginal('start_datetime'), 'UTC')
                    ->diffInMinutes(Carbon::parse($appointment->getRawOriginal('end_datetime'), 'UTC')));
                if ($durationMinutes < 15) {
                    $durationMinutes = max(30, $services->count() * 30);
                }

                $newStartManila = Carbon::createFromFormat('Y-m-d H:i', "{$targetDate} {$targetTime}", $timezone);
                $newEndManila = $newStartManila->copy()->addMinutes($durationMinutes);

                $newStartUtc = $newStartManila->copy()->setTimezone('UTC');
                $newEndUtc = $newEndManila->copy()->setTimezone('UTC');

                $hasConflict = Appointment::query()
                    ->where('id', '!=', $appointment->id)
                    ->where('stylist_id', $stylist->id)
                    ->whereIn('status', ['booked', 'pending', 'confirmed'])
                    ->where(function ($query) use ($newStartUtc, $newEndUtc) {
                        $query->where('start_datetime', '<', $newEndUtc)
                            ->where('end_datetime', '>', $newStartUtc);
                    })
                    ->exists();

                if ($hasConflict) {
                    return response()->json(['message' => 'Selected time is unavailable. Please choose another time.'], 409);
                }

                $updateData = [
                    'start_datetime' => $newStartUtc,
                    'end_datetime' => $newEndUtc,
                    'status' => 'booked',
                    'rescheduled_at' => now(),
                    'rescheduled_by_id' => $user ? $user->id : null,
                    'rescheduled_by_type' => $user ? get_class($user) : null,
                    'reschedule_reason' => $data['reschedule_reason'] ?? null,
                ];
            } else {
                $slot = $scheduler->findSlotForServices($stylist, $services->all(), $targetDate, $targetTime);
                if (!$slot) {
                    return response()->json(['message' => 'No slots available'], 409);
                }

                $slotStartUtc = Carbon::parse($slot['start'], $timezone)->setTimezone('UTC');
                $slotEndUtc = Carbon::parse($slot['end'], $timezone)->setTimezone('UTC');

                $updateData = [
                    'start_datetime' => $slotStartUtc,
                    'end_datetime' => $slotEndUtc,
                    'status' => 'booked',
                    'rescheduled_at' => now(),
                    'rescheduled_by_id' => $user ? $user->id : null,
                    'rescheduled_by_type' => $user ? get_class($user) : null,
                    'reschedule_reason' => $data['reschedule_reason'] ?? null,
                ];
            }
        } else {
            $updateData = [];
        }

        // Update other fields if provided
        if (isset($data['customer_name'])) $updateData['customer_name'] = $data['customer_name'];
        if (isset($data['customer_email'])) $updateData['customer_email'] = $data['customer_email'];
        if (isset($data['customer_phone'])) $updateData['customer_phone'] = $data['customer_phone'];
        if (isset($data['customer_address'])) $updateData['customer_address'] = $data['customer_address'];
        if (isset($data['payment_status'])) $updateData['payment_status'] = $data['payment_status'];

        $appointment->update($updateData);

        $appointment = $appointment->fresh()->load('stylist', 'service', 'services.variants');
        return $this->formatAppointmentForResponse($appointment);
    }

    public function cancel(Appointment $appointment)
    {
        $appointment->update(['status' => 'cancelled']);
        return response()->json(['message' => 'Cancelled']);
    }

    public function complete(Appointment $appointment)
    {
        // Check if appointment is already completed to avoid duplicate sales
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
                try {
                    // Create sale record
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
                } catch (\Throwable $e) {
                    Log::error('Failed to create sale record on appointment completion', [
                        'appointment_id' => $appointment->id,
                        'service_name' => $serviceName,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
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

    public function confirm(Appointment $appointment)
    {
        if ($appointment->payment_method === 'on_hand') {
            $total = (int) ($appointment->total_amount_cents ?? 0);
            $minDeposit = (int) round($total * 0.5);
            $deposit = (int) ($appointment->downpayment_amount_cents ?? 0);
            if ($deposit < $minDeposit) {
                return response()->json([
                    'message' => 'Deposit required before confirming this appointment.'
                ], 422);
            }
        }
        $appointment->update(['status' => 'confirmed']);
        return $appointment->fresh()->load(['stylist', 'service', 'services.variants']);
    }

    public function receipt(Appointment $appointment)
    {
        $appointment->load(['stylist', 'service', 'services.variants']);
        $appointment = $this->formatAppointmentForResponse($appointment);
    
        return response()->json([
            'appointment' => $appointment,
            'receipt_number' => 'APT-' . str_pad($appointment->id, 6, '0', STR_PAD_LEFT),
            'booking_date' => $appointment->created_at->copy()->timezone('Asia/Manila')->format('Y-m-d h:i:s A'),
        ]);
    }
    

    public function reschedule(Request $request, Appointment $appointment, Scheduler $scheduler)
    {
        $data = $request->validate([
            'date' => 'required|date|after_or_equal:today',
            'preferred_time' => 'nullable|date_format:H:i',
            'reschedule_reason' => 'nullable|string',
        ]);

        $timezone = 'Asia/Manila';

        // Check if date is a holiday
        $date = Carbon::parse($data['date'], $timezone)->format('Y-m-d');
        $holiday = Holiday::where('date', $date)->where('is_closed', true)->first();
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

        if (!empty($data['preferred_time'])) {
            $durationMinutes = max(15, Carbon::parse($appointment->getRawOriginal('start_datetime'), 'UTC')
                ->diffInMinutes(Carbon::parse($appointment->getRawOriginal('end_datetime'), 'UTC')));
            if ($durationMinutes < 15) {
                $durationMinutes = max(30, $services->count() * 30);
            }

            $newStartManila = Carbon::createFromFormat('Y-m-d H:i', "{$date} {$data['preferred_time']}", $timezone);
            $newEndManila = $newStartManila->copy()->addMinutes($durationMinutes);
            $newStartUtc = $newStartManila->copy()->setTimezone('UTC');
            $newEndUtc = $newEndManila->copy()->setTimezone('UTC');

            $hasConflict = Appointment::query()
                ->where('id', '!=', $appointment->id)
                ->where('stylist_id', $stylist->id)
                ->whereIn('status', ['booked', 'pending', 'confirmed'])
                ->where(function ($query) use ($newStartUtc, $newEndUtc) {
                    $query->where('start_datetime', '<', $newEndUtc)
                        ->where('end_datetime', '>', $newStartUtc);
                })
                ->exists();

            if ($hasConflict) {
                return response()->json(['message' => 'Selected time is unavailable. Please choose another time.'], 409);
            }

            $updatePayload = [
                'start_datetime' => $newStartUtc,
                'end_datetime' => $newEndUtc,
                'status' => 'booked',
                'rescheduled_at' => now(),
                'rescheduled_by_id' => $user ? $user->id : null,
                'rescheduled_by_type' => $user ? get_class($user) : null,
                'reschedule_reason' => $data['reschedule_reason'] ?? null,
            ];
        } else {
            $slot = $scheduler->findSlotForServices($stylist, $services->all(), $date, $data['preferred_time'] ?? null);
            if (!$slot) {
                return response()->json(['message' => 'No slots available'], 409);
            }

            $updatePayload = [
                'start_datetime' => Carbon::parse($slot['start'], $timezone)->setTimezone('UTC'),
                'end_datetime' => Carbon::parse($slot['end'], $timezone)->setTimezone('UTC'),
                'status' => 'booked',
                'rescheduled_at' => now(),
                'rescheduled_by_id' => $user ? $user->id : null,
                'rescheduled_by_type' => $user ? get_class($user) : null,
                'reschedule_reason' => $data['reschedule_reason'] ?? null,
            ];
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
        $appointment->update(['status' => 'missed']);
        return response()->json(['message' => 'Appointment marked as missed']);
    }

    public function history(Request $request)
    {
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
}
