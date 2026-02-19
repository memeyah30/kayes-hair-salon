<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\CustomerRating;
use App\Models\Sale;
use App\Models\Service;
use App\Models\Stylist;
use Carbon\Carbon;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    private function formatAppointmentForResponse($appointment)
    {
        $timezone = 'Asia/Manila';

        $rawStart = $appointment->getRawOriginal('start_datetime');
        if ($rawStart) {
            $startCarbon = Carbon::createFromFormat('Y-m-d H:i:s', $rawStart, 'UTC')->setTimezone($timezone);
            $appointment->start_datetime = $startCarbon->format('Y-m-d\TH:i:sP');
            $appointment->start_datetime_pht = $startCarbon->format('Y-m-d\TH:i:sP');
        }

        $rawEnd = $appointment->getRawOriginal('end_datetime');
        if ($rawEnd) {
            $endCarbon = Carbon::createFromFormat('Y-m-d H:i:s', $rawEnd, 'UTC')->setTimezone($timezone);
            $appointment->end_datetime = $endCarbon->format('Y-m-d\TH:i:sP');
            $appointment->end_datetime_pht = $endCarbon->format('Y-m-d\TH:i:sP');
        }

        return $appointment;
    }
    public function adminStats(Request $request)
    {
        $user = $request->user();
        $requestedType = strtolower((string) ($request->header('X-User-Type') ?: $request->query('type', '')));
        $resolvedUserType = strtolower((string) $request->attributes->get('resolved_user_type', ''));
        $effectiveUserType = in_array($resolvedUserType, ['admin', 'manager', 'stylist'], true)
            ? $resolvedUserType
            : $requestedType;

        // Keep sales visibility strictly admin-only, based on resolved request role.
        $canViewSales = $effectiveUserType === 'admin'
            || $user instanceof \App\Models\Admin;
        $timezone = 'Asia/Manila';
        $now = Carbon::now($timezone);
        $todayStart = $now->copy()->startOfDay();
        $todayEnd = $now->copy()->endOfDay();
        $weekStart = $now->copy()->startOfWeek();
        $monthStart = $now->copy()->startOfMonth();
        $periodEnd = $todayEnd->copy();
        $toManila = function ($value) use ($timezone) {
            if ($value instanceof Carbon) {
                return $value->copy()->setTimezone($timezone);
            }
            return Carbon::parse($value, 'UTC')->setTimezone($timezone);
        };

        $appointments = Appointment::with(['stylist', 'service'])->get();
        
        $todayAppointments = $appointments->filter(function ($apt) use ($toManila, $todayStart) {
            return $toManila($apt->start_datetime)->isSameDay($todayStart);
        });

        $weekAppointments = $appointments->filter(function ($apt) use ($toManila, $weekStart, $periodEnd) {
            $start = $toManila($apt->start_datetime);
            return $start->betweenIncluded($weekStart, $periodEnd);
        });

        $monthAppointments = $appointments->filter(function ($apt) use ($toManila, $monthStart, $periodEnd) {
            $start = $toManila($apt->start_datetime);
            return $start->betweenIncluded($monthStart, $periodEnd);
        });

        $todayRevenue = 0;
        $weekRevenue = 0;
        $monthRevenue = 0;
        if ($canViewSales) {
            $sumSalesForRange = function (Carbon $fromManila, Carbon $toManila) {
                return Sale::query()
                    ->whereBetween('created_at', [
                        $fromManila->copy()->setTimezone('UTC'),
                        $toManila->copy()->setTimezone('UTC'),
                    ])
                    ->sum('total_amount_cents');
            };

            $todayRevenue = $sumSalesForRange($todayStart, $todayEnd);
            $weekRevenue = $sumSalesForRange($weekStart, $periodEnd);
            $monthRevenue = $sumSalesForRange($monthStart, $periodEnd);
        }

        // Count unique customers using email if present, otherwise phone
        $customers = $appointments->map(function ($apt) {
                $email = $apt->customer_email ? strtolower(trim($apt->customer_email)) : null;
                $phone = $apt->customer_phone ? preg_replace('/[\\s\\-]/', '', trim($apt->customer_phone)) : null;
                return $email ?: $phone;
            })
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
            'revenue' => $canViewSales
                ? [
                    'today' => $todayRevenue,
                    'week' => $weekRevenue,
                    'month' => $monthRevenue,
                ]
                : [
                    'today' => 0,
                    'week' => 0,
                    'month' => 0,
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
        if (!($user instanceof \App\Models\Stylist)) {
            $user = \Illuminate\Support\Facades\Auth::guard('stylist')->user();
        }
        
        // The user should be a Stylist model instance when logged in as stylist
        if (!$user || !($user instanceof \App\Models\Stylist)) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }
        
        $stylist = $user;

        $timezone = 'Asia/Manila';
        $now = Carbon::now($timezone);
        $today = $now->copy()->startOfDay();
        $weekStart = $now->copy()->startOfWeek();
        $monthStart = $now->copy()->startOfMonth();

        $appointments = Appointment::where('stylist_id', $stylist->id)
            ->with(['service', 'services', 'stylist'])
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

        $sumSalesForRange = function (Carbon $from, Carbon $to) use ($stylist, $timezone) {
            return Sale::where('stylist_id', $stylist->id)
                ->where('transaction_type', 'service')
                ->whereBetween('created_at', [
                    $from->copy()->setTimezone($timezone)->setTimezone('UTC'),
                    $to->copy()->setTimezone($timezone)->setTimezone('UTC'),
                ])
                ->sum('total_amount_cents');
        };

        $salesDay = $sumSalesForRange($today->copy(), $today->copy()->endOfDay());
        $salesWeek = $sumSalesForRange($weekStart->copy(), $now->copy()->endOfDay());
        $salesMonth = $sumSalesForRange($monthStart->copy(), $now->copy()->endOfDay());

        return response()->json([
            'today_appointments' => $todayAppointments->values()->map(function ($apt) {
                return $this->formatAppointmentForResponse($apt);
            }),
            'total_completed' => $completed,
            'upcoming' => $upcoming,
            'total' => $appointments->count(),
            'sales' => [
                'day' => (int) $salesDay,
                'week' => (int) $salesWeek,
                'month' => (int) $salesMonth,
            ],
        ]);
    }

    public function customerStats(Request $request)
    {
        $email = $request->input('email');
        $phone = $request->input('phone');

        $email = $email ? strtolower(trim($email)) : null;
        $phone = $phone ? preg_replace('/[\s\-]/', '', trim($phone)) : null;

        // Require both fields and match both values to avoid cross-customer leakage.
        if (!$email || !$phone) {
            return response()->json(['message' => 'Email and phone are required'], 400);
        }

        $query = Appointment::with(['stylist', 'service', 'services.variants'])
            ->whereRaw('LOWER(TRIM(customer_email)) = ?', [$email])
            ->whereRaw("REPLACE(REPLACE(TRIM(COALESCE(customer_phone, '')), ' ', ''), '-', '') = ?", [$phone]);

        $appointments = $query->orderBy('start_datetime', 'asc')->get();

        $ratedAppointmentIds = CustomerRating::whereIn('appointment_id', $appointments->pluck('id'))
            ->pluck('appointment_id')
            ->flip();

        $now = Carbon::now('Asia/Manila');

        // Upcoming: future appointments that are still active
        $upcoming = $appointments->filter(function ($apt) use ($now) {
            $appointmentDate = Carbon::parse($apt->start_datetime)->setTimezone('Asia/Manila');
            return $appointmentDate->isFuture() && in_array($apt->status, ['booked', 'confirmed'], true);
        });

        // History: completed/cancelled/missed and past appointments
        $history = $appointments->filter(function ($apt) use ($now) {
            $appointmentDate = Carbon::parse($apt->start_datetime)->setTimezone('Asia/Manila');
            return !$appointmentDate->isFuture() || in_array($apt->status, ['completed', 'cancelled', 'missed'], true);
        });

        $totalSpent = $appointments
            ->where('status', 'completed')
            ->sum(function ($apt) {
                if (!empty($apt->total_amount_cents)) {
                    return (int) $apt->total_amount_cents;
                }

                if ($apt->relationLoaded('services') && $apt->services && $apt->services->count() > 0) {
                    return (int) $apt->services->sum('price_cents');
                }

                return (int) ($apt->service->price_cents ?? 0);
            });

        return response()->json([
            'upcoming' => $upcoming->values()->map(function ($apt) {
                return $this->formatAppointmentForResponse($apt);
            }),
            'history' => $history->values()->map(function ($apt) use ($ratedAppointmentIds) {
                $formatted = $this->formatAppointmentForResponse($apt);
                $hasRating = $ratedAppointmentIds->has($apt->id);
                $formatted->has_rating = $hasRating;
                $formatted->can_rate = $apt->status === 'completed' && !$hasRating;
                return $formatted;
            }),
            'total_spent' => (int) $totalSpent,
            'total_appointments' => $appointments->count(),
        ]);
    }
}
