<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Service;
use App\Models\Stylist;
use Carbon\Carbon;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function adminStats()
    {
        $today = Carbon::today();
        $weekStart = $today->copy()->startOfWeek();
        $monthStart = $today->copy()->startOfMonth();

        $appointments = Appointment::with(['stylist', 'service'])->get();
        
        $todayAppointments = $appointments->filter(function ($apt) use ($today) {
            return Carbon::parse($apt->start_datetime)->isSameDay($today);
        });

        $weekAppointments = $appointments->filter(function ($apt) use ($weekStart) {
            return Carbon::parse($apt->start_datetime)->gte($weekStart);
        });

        $monthAppointments = $appointments->filter(function ($apt) use ($monthStart) {
            return Carbon::parse($apt->start_datetime)->gte($monthStart);
        });

        // Calculate revenue
        $todayRevenue = $todayAppointments->where('status', 'completed')->sum(function ($apt) {
            return $apt->service->price_cents ?? 0;
        });

        $weekRevenue = $weekAppointments->where('status', 'completed')->sum(function ($apt) {
            return $apt->service->price_cents ?? 0;
        });

        $monthRevenue = $monthAppointments->where('status', 'completed')->sum(function ($apt) {
            return $apt->service->price_cents ?? 0;
        });

        // Count unique customers
        $customers = $appointments->pluck('customer_email', 'customer_phone')
            ->filter()
            ->unique()
            ->count();

        // Appointment status summary
        $statusSummary = [
            'booked' => $appointments->where('status', 'booked')->count(),
            'completed' => $appointments->where('status', 'completed')->count(),
            'cancelled' => $appointments->where('status', 'cancelled')->count(),
        ];

        return response()->json([
            'appointments' => [
                'today' => $todayAppointments->count(),
                'week' => $weekAppointments->count(),
                'month' => $monthAppointments->count(),
                'total' => $appointments->count(),
            ],
            'revenue' => [
                'today' => $todayRevenue,
                'week' => $weekRevenue,
                'month' => $monthRevenue,
            ],
            'stylists' => [
                'active' => Stylist::where('active', true)->count(),
                'total' => Stylist::count(),
            ],
            'customers' => $customers,
            'services' => Service::count(),
            'status_summary' => $statusSummary,
        ]);
    }

    public function stylistStats(Request $request)
    {
        $user = $request->user();
        
        // The user should be a Stylist model instance when logged in as stylist
        if (!$user || !($user instanceof \App\Models\Stylist)) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }
        
        $stylist = $user;

        $today = Carbon::today();
        $appointments = Appointment::where('stylist_id', $stylist->id)
            ->with(['service', 'stylist'])
            ->get();

        $todayAppointments = $appointments->filter(function ($apt) use ($today) {
            return Carbon::parse($apt->start_datetime)->isSameDay($today);
        });

        $completed = $appointments->where('status', 'completed')->count();
        $upcoming = $appointments->where('status', 'booked')
            ->filter(function ($apt) {
                return Carbon::parse($apt->start_datetime)->isFuture();
            })
            ->count();

        return response()->json([
            'today_appointments' => $todayAppointments->values(),
            'total_completed' => $completed,
            'upcoming' => $upcoming,
            'total' => $appointments->count(),
        ]);
    }

    public function customerStats(Request $request)
    {
        $email = $request->input('email');
        $phone = $request->input('phone');

        if (!$email && !$phone) {
            return response()->json(['message' => 'Email or phone required'], 400);
        }

        $query = Appointment::with(['stylist', 'service']);
        
        if ($email) {
            $query->where('customer_email', $email);
        }
        if ($phone) {
            $query->orWhere('customer_phone', $phone);
        }

        $appointments = $query->orderBy('start_datetime', 'desc')->get();

        $upcoming = $appointments->filter(function ($apt) {
            return Carbon::parse($apt->start_datetime)->isFuture() && $apt->status === 'booked';
        });

        $history = $appointments->filter(function ($apt) {
            return Carbon::parse($apt->start_datetime)->isPast() || $apt->status !== 'booked';
        });

        $totalSpent = $history->where('status', 'completed')->sum(function ($apt) {
            return $apt->service->price_cents ?? 0;
        });

        return response()->json([
            'upcoming' => $upcoming->values(),
            'history' => $history->values(),
            'total_spent' => $totalSpent,
            'total_appointments' => $appointments->count(),
        ]);
    }
}

