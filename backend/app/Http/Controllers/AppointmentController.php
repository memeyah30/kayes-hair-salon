<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Service;
use App\Models\Stylist;
use App\Models\Holiday;
use App\Services\Scheduler;
use App\Jobs\SendConfirmationJob;
use Carbon\Carbon;
use Illuminate\Http\Request;

class AppointmentController extends Controller
{
    public function index()
    {
        return Appointment::with(['stylist', 'service', 'services'])->latest('start_datetime')->get();
    }

    public function show(Appointment $appointment)
    {
        return $appointment->load(['stylist', 'service', 'services']);
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
            'stylist_id' => 'nullable|exists:stylists,id',
            'date' => 'required|date',
            'preferred_time' => 'nullable|date_format:H:i',
            'payment_method' => 'nullable|in:on_hand,online',
            'payment_status' => 'nullable|in:pending,downpayment,paid',
            'downpayment_amount_cents' => 'nullable|integer|min:0',
            'payment_proof_url' => 'nullable|url',
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

        // Load all services
        $services = Service::whereIn('id', $serviceIds)->get();
        if ($services->count() !== count($serviceIds)) {
            return response()->json(['message' => 'One or more services not found'], 422);
        }

        // Calculate total amount
        $totalAmountCents = $services->sum('price_cents');
        
        // Validate payment for online payments
        if ($data['payment_method'] === 'online') {
            if (empty($data['downpayment_amount_cents']) || $data['downpayment_amount_cents'] <= 0) {
                return response()->json(['message' => 'Downpayment is required for online payments'], 422);
            }
            if (empty($data['payment_proof_url'])) {
                return response()->json(['message' => 'Payment proof is required for online payments'], 422);
            }
        }

        $stylist = $data['stylist_id']
            ? Stylist::findOrFail($data['stylist_id'])
            : Stylist::where('active', true)->firstOrFail();

        // Find slot for all services (total duration)
        $slot = $scheduler->findSlotForServices($stylist, $services->all(), $data['date'], $data['preferred_time'] ?? null);
        if (!$slot) {
            // Calculate total duration for error message
            $totalDuration = $services->sum('duration_minutes');
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

        // Create appointment with first service_id for backward compatibility
        $appointment = Appointment::create([
            'stylist_id' => $stylist->id,
            'service_id' => $services->first()->id, // Keep for backward compatibility
            'customer_name' => $data['customer_name'],
            'customer_email' => $data['customer_email'] ?? null,
            'customer_phone' => $data['customer_phone'] ?? null,
            'customer_address' => $data['customer_address'] ?? null,
            'payment_method' => $data['payment_method'],
            'payment_status' => $data['payment_status'] ?? ($data['payment_method'] === 'online' ? 'downpayment' : 'pending'),
            'downpayment_amount_cents' => $data['downpayment_amount_cents'] ?? null,
            'total_amount_cents' => $totalAmountCents,
            'payment_proof_url' => $data['payment_proof_url'] ?? null,
            'start_datetime' => $slot['start'],
            'end_datetime' => $slot['end'],
        ]);

        // Attach all services to the appointment
        $appointment->services()->attach($serviceIds);

        // Send confirmation email immediately (synchronously) so customer gets instant confirmation
        if ($appointment->customer_email) {
            try {
                (new SendConfirmationJob($appointment->id))->handle();
                \Illuminate\Support\Facades\Log::info('Confirmation email sent immediately after booking', [
                    'appointment_id' => $appointment->id,
                    'email' => $appointment->customer_email
                ]);
            } catch (\Exception $e) {
                // Log error but don't fail the booking - email will be retried via queue if needed
                \Illuminate\Support\Facades\Log::error('Failed to send immediate confirmation email', [
                    'appointment_id' => $appointment->id,
                    'email' => $appointment->customer_email,
                    'error' => $e->getMessage()
                ]);
                // Also dispatch to queue as backup
                dispatch(new SendConfirmationJob($appointment->id));
            }
        } else {
            \Illuminate\Support\Facades\Log::warning('No email provided for appointment - confirmation not sent', [
                'appointment_id' => $appointment->id,
                'customer_name' => $appointment->customer_name
            ]);
        }

        // Load relationships and return
        $appointment->load(['stylist', 'service', 'services']);
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
            'payment_status' => 'sometimes|in:pending,downpayment,paid,refunded',
            'reschedule_reason' => 'nullable|string',
        ]);

        $user = $request->user();
        $isReschedule = isset($data['date']) || isset($data['preferred_time']);

        if ($isReschedule) {
            // Check if date is a holiday
            $date = Carbon::parse($data['date'])->format('Y-m-d');
            $holiday = Holiday::where('date', $date)->where('is_closed', true)->first();
            if ($holiday) {
                return response()->json([
                    'message' => "The salon is closed on {$holiday->name}. Please choose another date.",
                    'holiday' => $holiday
                ], 422);
            }

            // Validate time is between 8 AM and 7:59 PM (business hours: 8 AM - 8 PM)
            if (isset($data['preferred_time'])) {
                $time = Carbon::createFromFormat('H:i', $data['preferred_time']);
                $hour = (int)$time->format('H');
                if ($hour < 8 || $hour >= 20) {
                    return response()->json(['message' => 'Appointment time must be between 8:00 AM and 7:59 PM'], 422);
                }
            }

            $services = $appointment->services;
            $stylist = $appointment->stylist;
            $slot = $scheduler->findSlotForServices($stylist, $services->all(), $data['date'], $data['preferred_time'] ?? null);
            if (!$slot) {
                return response()->json(['message' => 'No slots available'], 409);
            }

            $updateData = [
                'start_datetime' => $slot['start'],
                'end_datetime' => $slot['end'],
                'status' => 'booked',
                'rescheduled_at' => now(),
                'rescheduled_by_id' => $user ? $user->id : null,
                'rescheduled_by_type' => $user ? get_class($user) : null,
                'reschedule_reason' => $data['reschedule_reason'] ?? null,
            ];
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

        return $appointment->fresh()->load('stylist', 'service', 'services');
    }

    public function cancel(Appointment $appointment)
    {
        $appointment->update(['status' => 'cancelled']);
        return response()->json(['message' => 'Cancelled']);
    }

    public function complete(Appointment $appointment)
    {
        $appointment->update(['status' => 'completed']);
        return response()->json(['message' => 'Marked as completed']);
    }

    public function confirm(Appointment $appointment)
    {
        $appointment->update(['status' => 'booked']);
        dispatch(new SendConfirmationJob($appointment->id));
        return response()->json(['message' => 'Appointment confirmed']);
    }

    public function receipt(Appointment $appointment)
    {
        $appointment->load(['stylist', 'service']);
        return response()->json([
            'appointment' => $appointment,
            'receipt_number' => 'APT-' . str_pad($appointment->id, 6, '0', STR_PAD_LEFT),
            'booking_date' => $appointment->created_at->format('Y-m-d H:i:s'),
        ]);
    }

    public function reschedule(Request $request, Appointment $appointment, Scheduler $scheduler)
    {
        $data = $request->validate([
            'date' => 'required|date|after_or_equal:today',
            'preferred_time' => 'nullable|date_format:H:i',
            'reschedule_reason' => 'nullable|string',
        ]);

        // Check if date is a holiday
        $date = Carbon::parse($data['date'])->format('Y-m-d');
        $holiday = Holiday::where('date', $date)->where('is_closed', true)->first();
        if ($holiday) {
            return response()->json([
                'message' => "The salon is closed on {$holiday->name}. Please choose another date.",
                'holiday' => $holiday
            ], 422);
        }

        // Validate time is between 8 AM and 7:59 PM
        if ($data['preferred_time']) {
            $time = Carbon::createFromFormat('H:i', $data['preferred_time']);
            $hour = (int)$time->format('H');
            if ($hour < 8 || $hour >= 20) {
                return response()->json(['message' => 'Appointment time must be between 8:00 AM and 7:59 PM'], 422);
            }
        }

        $services = $appointment->services;
        $stylist = $appointment->stylist;
        $slot = $scheduler->findSlotForServices($stylist, $services->all(), $data['date'], $data['preferred_time'] ?? null);
        if (!$slot) {
            return response()->json(['message' => 'No slots available'], 409);
        }

        $user = $request->user();

        $appointment->update([
            'start_datetime' => $slot['start'],
            'end_datetime' => $slot['end'],
            'status' => 'booked',
            'rescheduled_at' => now(),
            'rescheduled_by_id' => $user ? $user->id : null,
            'rescheduled_by_type' => $user ? get_class($user) : null,
            'reschedule_reason' => $data['reschedule_reason'] ?? null,
        ]);

        return response()->json([
            'message' => 'Appointment rescheduled successfully',
            'appointment' => $appointment->fresh()->load('stylist', 'service', 'services')
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
