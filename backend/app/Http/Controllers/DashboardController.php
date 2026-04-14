<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\AppointmentRating;
use App\Models\CustomerRating;
use App\Models\Inventory;
use App\Models\Sale;
use App\Models\Service;
use App\Models\Stylist;
use App\Services\MissedAppointmentService;
use Carbon\Carbon;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    private function formatAppointmentForResponse($appointment)
    {
        // Keep the model-provided Asia/Manila datetime serialization intact.
        // Reassigning casted datetime attributes here causes an extra 8-hour shift.
        $appointment->is_rescheduled = !empty($appointment->getRawOriginal('rescheduled_at'));

        return $appointment;
    }

    private function getAppointmentServicePriceCents($service): int
    {
        if (!$service) {
            return 0;
        }

        $variantId = $service->pivot?->service_variant_id;
        if ($variantId && $service->relationLoaded('variants') && $service->variants) {
            $variant = $service->variants->firstWhere('id', $variantId);
            if ($variant && isset($variant->price_cents)) {
                return (int) $variant->price_cents;
            }
        }

        return (int) ($service->price_cents ?? 0);
    }

    private function getAppointmentTotalAmountCents($appointment): int
    {
        if (isset($appointment->total_amount_cents) && is_numeric($appointment->total_amount_cents)) {
            return (int) $appointment->total_amount_cents;
        }

        if ($appointment->relationLoaded('services') && $appointment->services && $appointment->services->count() > 0) {
            return (int) $appointment->services->sum(fn ($service) => $this->getAppointmentServicePriceCents($service));
        }

        return $this->getAppointmentServicePriceCents($appointment->service);
    }

    public function adminStats(Request $request)
    {
        app(MissedAppointmentService::class)->markOverdueAppointmentsAsMissed();

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
        $weekEnd = $weekStart->copy()->endOfWeek();
        $monthStart = $now->copy()->startOfMonth();
        $periodEnd = $todayEnd->copy();
        $toManila = function ($value) use ($timezone) {
            if ($value instanceof Carbon) {
                return $value->copy()->setTimezone($timezone);
            }
            return Carbon::parse($value, 'UTC')->setTimezone($timezone);
        };

        $appointments = Appointment::with(['stylist', 'service.variants', 'services.variants'])->get();
        
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

        $sumAppointmentRevenue = function ($collection) {
            return (int) $collection->sum(function ($apt) {
                return $this->getAppointmentTotalAmountCents($apt);
            });
        };

        $completedTodayAppointments = $todayAppointments->where('status', 'completed');
        $completedWeekAppointments = $weekAppointments->where('status', 'completed');
        $completedMonthAppointments = $monthAppointments->where('status', 'completed');

        $todayRevenue = 0;
        $weekRevenue = 0;
        $monthRevenue = 0;
        $weekRevenueSeries = [];
        for ($offset = 0; $offset < 7; $offset++) {
            $day = $weekStart->copy()->addDays($offset);
            $weekRevenueSeries[$day->toDateString()] = [
                'date' => $day->toDateString(),
                'label' => $day->format('D'),
                'value' => 0,
            ];
        }
        if ($canViewSales) {
            $serviceSaleAppointmentIds = Sale::query()
                ->whereNotNull('appointment_id')
                ->where('transaction_type', 'service')
                ->pluck('appointment_id')
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->flip();

            $sumSalesForRange = function (Carbon $fromManila, Carbon $toManila) {
                return Sale::query()
                    ->whereBetween('created_at', [
                        $fromManila->copy()->setTimezone('UTC'),
                        $toManila->copy()->setTimezone('UTC'),
                    ])
                    ->sum('total_amount_cents');
            };

            $weekSales = Sale::query()
                ->whereBetween('created_at', [
                    $weekStart->copy()->setTimezone('UTC'),
                    $weekEnd->copy()->setTimezone('UTC'),
                ])
                ->get(['created_at', 'total_amount_cents']);

            foreach ($weekSales as $sale) {
                $dateKey = Carbon::parse($sale->created_at, 'UTC')->setTimezone($timezone)->toDateString();
                if (isset($weekRevenueSeries[$dateKey])) {
                    $weekRevenueSeries[$dateKey]['value'] += (int) ($sale->total_amount_cents ?? 0);
                }
            }

            $unsyncedTodayRevenue = $sumAppointmentRevenue(
                $completedTodayAppointments->filter(
                    fn ($apt) => !$serviceSaleAppointmentIds->has((int) $apt->id)
                )
            );
            $unsyncedWeekRevenue = $sumAppointmentRevenue(
                $completedWeekAppointments->filter(
                    fn ($apt) => !$serviceSaleAppointmentIds->has((int) $apt->id)
                )
            );
            $unsyncedMonthRevenue = $sumAppointmentRevenue(
                $completedMonthAppointments->filter(
                    fn ($apt) => !$serviceSaleAppointmentIds->has((int) $apt->id)
                )
            );

            $todayRevenue = (int) $sumSalesForRange($todayStart, $todayEnd) + $unsyncedTodayRevenue;
            $weekRevenue = (int) $sumSalesForRange($weekStart, $periodEnd) + $unsyncedWeekRevenue;
            $monthRevenue = (int) $sumSalesForRange($monthStart, $periodEnd) + $unsyncedMonthRevenue;

            foreach ($completedWeekAppointments->filter(
                fn ($apt) => !$serviceSaleAppointmentIds->has((int) $apt->id)
            ) as $appointment) {
                $dateKey = $toManila($appointment->start_datetime)->toDateString();
                if (isset($weekRevenueSeries[$dateKey])) {
                    $weekRevenueSeries[$dateKey]['value'] += $this->getAppointmentTotalAmountCents($appointment);
                }
            }
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

        $inventoryStats = [
            'total_items' => (int) Inventory::query()->where('is_active', true)->count(),
            'low_stock_items' => (int) Inventory::query()
                ->where('is_active', true)
                ->lowStock()
                ->count(),
            'low_stock_alerts' => Inventory::query()
                ->where('is_active', true)
                ->lowStock()
                ->orderBy('quantity')
                ->limit(10)
                ->get(['id', 'name', 'quantity', 'min_stock_level']),
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
                    'week_series' => array_values($weekRevenueSeries),
                ]
                : [
                    'today' => 0,
                    'week' => 0,
                    'month' => 0,
                    'week_series' => array_values($weekRevenueSeries),
                ],
            'stylists' => [
                'active' => Stylist::where('active', true)->count(),
                'total' => Stylist::count(),
            ],
            'customers' => $customers,
            'services' => Service::count(),
            'status_summary' => $statusSummary,
            'inventory' => $inventoryStats,
        ]);
    }

    public function stylistStats(Request $request)
    {
        app(MissedAppointmentService::class)->markOverdueAppointmentsAsMissed();

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
        app(MissedAppointmentService::class)->markOverdueAppointmentsAsMissed();

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
        $appointmentIds = $appointments->pluck('id');

        $appointmentRatingsById = AppointmentRating::query()
            ->whereIn('appointment_id', $appointmentIds)
            ->get()
            ->keyBy('appointment_id');
        $customerRatingsById = CustomerRating::query()
            ->whereIn('appointment_id', $appointmentIds)
            ->get()
            ->keyBy('appointment_id');

        $ratedAppointmentIds = $appointmentRatingsById
            ->keys()
            ->merge($customerRatingsById->keys())
            ->unique()
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
                return $this->getAppointmentTotalAmountCents($apt);
            });

        $ratings = $appointments
            ->map(function ($apt) use ($appointmentRatingsById, $customerRatingsById) {
                $ratingPayload = $this->buildRatingPayload(
                    $appointmentRatingsById->get($apt->id),
                    $customerRatingsById->get($apt->id)
                );

                if (!$ratingPayload) {
                    return null;
                }

                $start = Carbon::parse($apt->getRawOriginal('start_datetime'), 'UTC')->setTimezone('Asia/Manila');
                $serviceName = $apt->services && $apt->services->isNotEmpty()
                    ? $apt->services->pluck('name')->implode(', ')
                    : ($apt->service->name ?? 'Service');

                return array_merge(
                    [
                        'appointment_id' => $apt->id,
                        'service_name' => $serviceName,
                        'stylist_name' => $apt->stylist?->name ?? 'Stylist',
                        'appointment_date' => $start->format('Y-m-d'),
                        'appointment_time' => $start->format('H:i'),
                    ],
                    $ratingPayload
                );
            })
            ->filter()
            ->sortByDesc('rated_at')
            ->values();

        return response()->json([
            'upcoming' => $upcoming->values()->map(function ($apt) {
                return $this->formatAppointmentForResponse($apt);
            }),
            'history' => $history->values()->map(function ($apt) use ($ratedAppointmentIds, $appointmentRatingsById, $customerRatingsById) {
                $formatted = $this->formatAppointmentForResponse($apt);
                $ratingPayload = $this->buildRatingPayload(
                    $appointmentRatingsById->get($apt->id),
                    $customerRatingsById->get($apt->id)
                );
                $hasRating = $ratedAppointmentIds->has($apt->id) && !is_null($ratingPayload);
                $formatted->has_rating = $hasRating;
                $formatted->can_rate = $apt->status === 'completed' && !$hasRating;
                $formatted->rating = $ratingPayload;
                return $formatted;
            }),
            'ratings' => $ratings,
            'total_spent' => (int) $totalSpent,
            'total_appointments' => $appointments->count(),
        ]);
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
}
