<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Service;
use App\Models\Stylist;
use App\Services\Scheduler;
use App\Jobs\SendConfirmationJob;
use App\Jobs\SendReminderJob;
//use Carbon\Carbon;
use Illuminate\Http\Request;

class AppointmentController extends Controller
{
    public function index()
    {
        return Appointment::with(['stylist', 'service'])->latest('start_datetime')->get();
    }

    public function show(Appointment $appointment)
    {
        return $appointment->load('stylist', 'service');
    }

    public function store(Request $request, Scheduler $scheduler)
    {
        $data = $request->validate([
            'customer_name' => 'required|string',
            'customer_email' => 'nullable|email',
            'customer_phone' => 'nullable|string',
            'service_id' => 'required|exists:services,id',
            'stylist_id' => 'nullable|exists:stylists,id',
            'date' => 'required|date',
            'preferred_time' => 'nullable|date_format:H:i',
        ]);

        $service = Service::findOrFail($data['service_id']);
        $stylist = $data['stylist_id']
            ? Stylist::findOrFail($data['stylist_id'])
            : Stylist::where('active', true)->firstOrFail();

        $slot = $scheduler->findSlot($stylist, $service, $data['date'], $data['preferred_time'] ?? null);
        if (!$slot) {
            return response()->json(['message' => 'No slots available for this date'], 409);
        }

        $appointment = Appointment::create([
            'stylist_id' => $stylist->id,
            'service_id' => $service->id,
            'customer_name' => $data['customer_name'],
            'customer_email' => $data['customer_email'] ?? null,
            'customer_phone' => $data['customer_phone'] ?? null,
            'start_datetime' => $slot['start'],
            'end_datetime' => $slot['end'],
        ]);

        dispatch(new SendConfirmationJob($appointment->id));
        dispatch((new SendReminderJob($appointment->id))->delay($slot['start']->copy()->subHour()));
        dispatch((new SendReminderJob($appointment->id, 24))->delay($slot['start']->copy()->subHours(24)));

        // Load relationships and return
        $appointment->load(['stylist', 'service']);
        return response()->json($appointment);
    }

    public function update(Request $request, Appointment $appointment, Scheduler $scheduler)
    {
        $data = $request->validate([
            'date' => 'required|date',
            'preferred_time' => 'nullable|date_format:H:i',
        ]);

        $service = $appointment->service;
        $stylist = $appointment->stylist;
        $slot = $scheduler->findSlot($stylist, $service, $data['date'], $data['preferred_time'] ?? null);
        if (!$slot) {
            return response()->json(['message' => 'No slots available'], 409);
        }

        $appointment->update([
            'start_datetime' => $slot['start'],
            'end_datetime' => $slot['end'],
            'status' => 'booked',
        ]);

        return $appointment->fresh()->load('stylist', 'service');
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
}
