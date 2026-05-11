<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithPagination;
use App\Models\Appointment;
use App\Models\Sale;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class SaleController extends Controller
{
    use InteractsWithPagination;

    public function index(Request $request)
    {
        $request->validate([
            'start_date' => ['nullable', 'date_format:Y-m-d'],
            'end_date' => ['nullable', 'date_format:Y-m-d'],
            'transaction_type' => ['nullable', 'in:service,product,both'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'paginate' => ['nullable'],
            'payment_method' => ['nullable', 'string'],
            'payment_status' => ['nullable', 'string'],
            'appointment_status' => ['nullable', 'string'],
            'q' => ['nullable', 'string'],
        ]);

        $timezone = 'Asia/Manila';
        
        // Lazy-sync: Ensure all appointments with payments have sale records before querying
        $this->syncMissingSales();

        $query = Sale::with(['appointment']);
        $this->applySaleDateRange($query, $request->start_date ?? null, $request->end_date ?? null, $timezone);

        // Filter by payment method
        if ($request->filled('payment_method')) {
            $query->where('payment_method', $request->payment_method);
        }

        // Filter by payment status
        $this->applyPaymentStatusFilter($query, $request->payment_status ?? null);

        // Filter by appointment status
        if ($request->filled('appointment_status')) {
            $query->whereHas('appointment', function($q) use ($request) {
                $q->where('status', $request->appointment_status);
            });
        }

        // Filter by search keyword
        if ($request->filled('q')) {
            $keyword = $request->q;
            $query->where(function($q) use ($keyword) {
                $q->where('item_name', 'like', "%{$keyword}%")
                  ->orWhere('customer_name', 'like', "%{$keyword}%")
                  ->orWhere('appointment_id', $keyword);
            });
        }

        $query->orderByRaw($this->saleTimestampExpression() . ' asc');

        if ($this->shouldPaginate($request)) {
            return response()->json(
                $query->paginate($this->resolvePerPage($request))
            );
        }

        return $query->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'appointment_id' => 'nullable|exists:appointments,id',
            'transaction_type' => 'required|in:service,product,both',
            'item_name' => 'required|string|max:255',
            'quantity' => 'required|integer|min:1',
            'unit_price_cents' => 'required|integer|min:0',
            'payment_method' => 'required|in:cash,gcash,paymaya,card,other',
            'payment_status' => 'nullable|in:pending,paid,refunded,partially_paid,downpayment',
            'customer_name' => 'nullable|string|max:255',
            'customer_phone' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $data['total_amount_cents'] = $data['quantity'] * $data['unit_price_cents'];
        $data['payment_status'] = $data['payment_status'] ?? 'paid';
        $data['recorded_at'] = $data['recorded_at'] ?? now();

        try {
            $sale = Sale::create($data);
            return response()->json($sale->load(['appointment']), 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to record sale.'], 500);
        }
    }

    public function show(Sale $sale)
    {
        return $sale->load(['appointment']);
    }

    public function update(Request $request, Sale $sale)
    {
        $data = $request->validate([
            'payment_status' => 'sometimes|in:pending,paid,refunded,partially_paid,downpayment',
            'notes' => 'nullable|string',
        ]);

        $sale->update($data);
        return $sale->fresh()->load(['appointment']);
    }

    public function destroy(Sale $sale)
    {
        $sale->delete();
        return response()->json(['message' => 'Sale deleted successfully']);
    }

    /**
     * Finds appointments with payments that are missing sales records and creates them.
     */
    private function syncMissingSales()
    {
        // Only include bookings that are COMPLETED to avoid inflating revenue with unearned income.
        $appointments = \App\Models\Appointment::whereIn('status', ['completed'])
            ->where(function ($query) {
                $query->whereIn('payment_status', ['paid', 'downpayment', 'verified'])
                    ->orWhere('downpayment_amount_cents', '>', 0);
            })
            ->whereNotExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('sales')
                    ->whereRaw('sales.appointment_id = appointments.id');
            })
            ->get();

        if ($appointments->isEmpty()) {
            return;
        }

        $appointmentController = new \App\Http\Controllers\AppointmentController();
        foreach ($appointments as $appointment) {
            try {
                $appointmentController->recordSales($appointment);
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error("Failed to sync sale for appointment {$appointment->id}: " . $e->getMessage());
            }
        }
    }

    public function stats(Request $request)
    {
        $request->validate([
            'start_date' => ['nullable', 'date_format:Y-m-d'],
            'end_date' => ['nullable', 'date_format:Y-m-d'],
            'payment_method' => ['nullable', 'string'],
            'payment_status' => ['nullable', 'string'],
            'appointment_status' => ['nullable', 'string'],
            'q' => ['nullable', 'string'],
        ]);

        $timezone = 'Asia/Manila';
        
        // Lazy-sync: Ensure all appointments with payments have sale records before querying
        $this->syncMissingSales();

        $nowManila = Carbon::now($timezone);
        $startManila = $request->filled('start_date')
            ? Carbon::createFromFormat('Y-m-d', $request->start_date, $timezone)->startOfDay()
            : $nowManila->copy()->startOfMonth()->startOfDay();
        $endManila = $request->filled('end_date')
            ? Carbon::createFromFormat('Y-m-d', $request->end_date, $timezone)->endOfDay()
            : $nowManila->copy()->endOfMonth()->endOfDay();

        if ($endManila->lt($startManila)) {
            [$startManila, $endManila] = [$endManila->copy()->startOfDay(), $startManila->copy()->endOfDay()];
        }

        $startUtc = $startManila->copy()->setTimezone('UTC');
        $endUtc = $endManila->copy()->setTimezone('UTC');

        // Filter using Manila day boundaries converted to UTC to avoid date drift.
        $baseQuery = Sale::query();
        $this->applySaleDateRange($baseQuery, $startManila->toDateString(), $endManila->toDateString(), $timezone);

        // Apply filters identical to index()
        if ($request->filled('payment_method')) {
            $baseQuery->where('payment_method', $request->payment_method);
        }

        $this->applyPaymentStatusFilter($baseQuery, $request->payment_status ?? null);

        if ($request->filled('appointment_status')) {
            $baseQuery->whereHas('appointment', function($q) use ($request) {
                $q->where('status', $request->appointment_status);
            });
        }

        if ($request->filled('q')) {
            $keyword = $request->q;
            $baseQuery->where(function($q) use ($keyword) {
                $q->where('item_name', 'like', "%{$keyword}%")
                  ->orWhere('customer_name', 'like', "%{$keyword}%")
                  ->orWhere('appointment_id', $keyword);
            });
        }

        // Total sales
        $totalSales = (clone $baseQuery)->sum('total_amount_cents');

        // Sales by type
        $salesByType = (clone $baseQuery)
            ->select('transaction_type', DB::raw('SUM(total_amount_cents) as total'))
            ->groupBy('transaction_type')
            ->get()
            ->pluck('total', 'transaction_type');

        // Sales by payment method
        $salesByPayment = (clone $baseQuery)
            ->select('payment_method', DB::raw('SUM(total_amount_cents) as total'))
            ->groupBy('payment_method')
            ->get()
            ->pluck('total', 'payment_method');

        // Top selling items
        $topItems = (clone $baseQuery)
            ->select('item_name', DB::raw('SUM(quantity) as total_quantity'), DB::raw('SUM(total_amount_cents) as total_revenue'))
            ->groupBy('item_name')
            ->orderBy('total_revenue', 'desc')
            ->limit(10)
            ->get();

        // Daily sales grouped in Manila timezone.
        $dailySales = (clone $baseQuery)
            ->selectRaw($this->saleTimestampExpression() . ' as sale_datetime, total_amount_cents')
            ->orderByRaw($this->saleTimestampExpression())
            ->get()
            ->groupBy(function ($sale) use ($timezone) {
                return Carbon::parse($sale->sale_datetime)->setTimezone($timezone)->toDateString();
            })
            ->map(function ($items, $date) {
                return [
                    'date' => $date,
                    'total' => (int) $items->sum('total_amount_cents'),
                ];
            })
            ->values();

        $appointmentIds = (clone $baseQuery)
            ->whereNotNull('appointment_id')
            ->distinct()
            ->pluck('appointment_id');

        // Calculate appointmentsSummary using ALL appointments in the date range, 
        // not just those that have a Sale record. This ensures downpayments are tracked.
        $appointmentsInRange = Appointment::query()
            ->whereBetween('start_datetime', [$startUtc, $endUtc])
            ->get();

        $appointmentsSummary = [
            'total_downpayment_cents' => $appointmentsInRange->where('mode_of_payment', 'downpayment')->sum('amount_paid_cents'),
            'total_full_payment_cents' => $appointmentsInRange->where('mode_of_payment', 'full')->sum('amount_paid_cents'),
            'total_collected_cents' => $appointmentsInRange->sum('amount_paid_cents'),
            'total_remaining_balance_cents' => $appointmentsInRange->sum('remaining_balance_cents'),
            'count_completed' => $appointmentsInRange->where('status', 'completed')->count(),
            'count_cancelled' => $appointmentsInRange->where('status', 'cancelled')->count(),
            'count_missed' => $appointmentsInRange->where('status', 'missed')->count(),
            'count_booked' => $appointmentsInRange->where('status', 'booked')->count(),
            'count_confirmed' => $appointmentsInRange->where('status', 'confirmed')->count(),
        ];

        return response()->json([
            'period' => [
                'start_date' => $startManila->toDateString(),
                'end_date' => $endManila->toDateString(),
            ],
            'total_sales_cents' => $totalSales,
            'actual_sales_cents' => $appointmentsSummary['total_collected_cents'],
            'sales_by_type' => $salesByType,
            'sales_by_payment_method' => $salesByPayment,
            'top_selling_items' => $topItems,
            'daily_sales' => $dailySales,
            'appointments_summary' => $appointmentsSummary,
        ]);
    }

    public function exportPdf(Request $request)
    {
        $request->validate([
            'start_date' => ['nullable', 'date_format:Y-m-d'],
            'end_date' => ['nullable', 'date_format:Y-m-d'],

            'payment_method' => ['nullable', 'string'],
            'payment_status' => ['nullable', 'string'],
            'appointment_status' => ['nullable', 'string'],
            'q' => ['nullable', 'string'],
        ]);

        $timezone = 'Asia/Manila';
        
        // Lazy-sync: Ensure all appointments with payments have sale records before exporting
        $this->syncMissingSales();

        $query = Sale::with(['appointment']);

        $startDate = $request->filled('start_date')
            ? $request->start_date
            : Carbon::now($timezone)->startOfMonth()->toDateString();
        $endDate = $request->filled('end_date')
            ? $request->end_date
            : Carbon::now($timezone)->toDateString();

        $startUtc = Carbon::createFromFormat('Y-m-d', $startDate, $timezone)
            ->startOfDay()
            ->setTimezone('UTC');
        $endUtc = Carbon::createFromFormat('Y-m-d', $endDate, $timezone)
            ->endOfDay()
            ->setTimezone('UTC');

        $this->applySaleDateRange($query, $startDate, $endDate, $timezone);

        // Filter by payment method
        if ($request->filled('payment_method')) {
            $query->where('payment_method', $request->payment_method);
        }

        // Filter by payment status
        $this->applyPaymentStatusFilter($query, $request->payment_status ?? null);

        // Filter by appointment status
        if ($request->filled('appointment_status')) {
            $query->whereHas('appointment', function($q) use ($request) {
                $q->where('status', $request->appointment_status);
            });
        }

        // Filter by search keyword
        if ($request->filled('q')) {
            $keyword = $request->q;
            $query->where(function($q) use ($keyword) {
                $q->where('item_name', 'like', "%{$keyword}%")
                  ->orWhere('customer_name', 'like', "%{$keyword}%");
            });
        }

        $sales = $query->orderByRaw($this->saleTimestampExpression() . ' desc')->get();

        // Group sales by appointment_id for the report
        $groupedSales = $sales->groupBy(function($sale) {
            return $sale->appointment_id ? 'apt-' . $sale->appointment_id : 'sale-' . $sale->id;
        })->map(function($items) {
            $first = $items->first();
            $appointment = $first->appointment;
            
            return [
                'id' => $first->id,
                'appointment_id' => $first->appointment_id,
                'customer_name' => $first->customer_name,
                'payment_method' => $first->payment_method,
                'payment_status' => $first->payment_status,
                'recorded_at' => $first->recorded_at ?? $first->created_at,
                'appointment' => $appointment,
                'items' => $items,
                'total_amount_cents' => $appointment ? $appointment->total_amount_cents : $items->sum('total_amount_cents'),
                'amount_paid_cents' => $appointment ? $appointment->amount_paid_cents : $items->sum('total_amount_cents'),
                'remaining_balance_cents' => $appointment ? $appointment->remaining_balance_cents : 0,
                'downpayment_amount_cents' => $appointment ? ($appointment->downpayment_amount_cents ?: 0) : 0,
            ];
        });

        // Calculate stats
        $totalSales = $sales->sum('total_amount_cents');

        $appointmentIds = $sales->pluck('appointment_id')->filter()->unique()->values();
        $appointments = Appointment::query()
            ->whereIn('id', $appointmentIds)
            ->get();

        $appointmentsSummary = [
            'total_downpayment_cents' => $appointments->where('mode_of_payment', 'downpayment')->sum('amount_paid_cents'),
            'total_full_payment_cents' => $appointments->where('mode_of_payment', 'full')->sum('amount_paid_cents'),
            'total_collected_cents' => $appointments->sum('amount_paid_cents'),
            'total_remaining_balance_cents' => $appointments->sum('remaining_balance_cents'),
            'count_completed' => $appointments->where('status', 'completed')->count(),
            'count_cancelled' => $appointments->where('status', 'cancelled')->count(),
            'count_missed' => $appointments->where('status', 'missed')->count(),
            'count_booked' => $appointments->where('status', 'booked')->count(),
            'count_confirmed' => $appointments->where('status', 'confirmed')->count(),
        ];

        $data = [
            'salon_name' => 'Kaye\'s Hair Salon and Spa',
            'generated_at' => Carbon::now($timezone)->format('M d, Y h:i A'),
            'generated_by' => $request->user() ? $request->user()->name : 'Admin',
            'start_date' => $startUtc->copy()->setTimezone($timezone)->format('M d, Y'),
            'end_date' => $endUtc->copy()->setTimezone($timezone)->format('M d, Y'),
            'filters' => [
                'payment_method' => $request->payment_method,
                'payment_status' => $request->payment_status,
                'appointment_status' => $request->appointment_status,
                'search_keyword' => $request->q,
            ],
            'sales' => $groupedSales,
            'total_sales_cents' => $totalSales,
            'actual_sales_cents' => $appointmentsSummary['total_collected_cents'],
            'appointments_summary' => $appointmentsSummary,
        ];

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.sales-report', $data);
        
        $filename = 'sales_report_' . $startUtc->setTimezone($timezone)->format('Ymd') . '_to_' . $endUtc->setTimezone($timezone)->format('Ymd') . '.pdf';
        
        return $pdf->download($filename);
    }

    private function applyPaymentStatusFilter($query, ?string $paymentStatus): void
    {
        $status = strtolower(trim((string) $paymentStatus));

        if ($status === '') {
            return;
        }

        if (in_array($status, ['downpayment', 'partially_paid'], true)) {
            $query->where(function ($subQuery) {
                $subQuery->whereIn('payment_status', ['downpayment', 'partially_paid'])
                    ->orWhereHas('appointment', function ($appointmentQuery) {
                        $appointmentQuery->where('downpayment_amount_cents', '>', 0);
                    });
            });
            return;
        }

        $query->where('payment_status', $status);
    }

    private function saleTimestampExpression(): string
    {
        return 'COALESCE(recorded_at, created_at)';
    }

    private function applySaleDateRange($query, ?string $startDate, ?string $endDate, string $timezone): void
    {
        if (!$startDate && !$endDate) {
            return;
        }

        if ($startDate) {
            $startUtc = Carbon::createFromFormat('Y-m-d', $startDate, $timezone)
                ->startOfDay()
                ->setTimezone('UTC');
            $query->whereRaw($this->saleTimestampExpression() . ' >= ?', [$startUtc]);
        }

        if ($endDate) {
            $endUtc = Carbon::createFromFormat('Y-m-d', $endDate, $timezone)
                ->endOfDay()
                ->setTimezone('UTC');
            $query->whereRaw($this->saleTimestampExpression() . ' <= ?', [$endUtc]);
        }
    }
}
