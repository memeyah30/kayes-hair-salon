<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithPagination;
use App\Models\Sale;
use App\Models\Inventory;
use App\Services\InventoryWorkflowService;
use App\Models\Stylist;
use Barryvdh\DomPDF\Facade\Pdf;
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
            'stylist_id' => ['nullable', 'integer', 'exists:stylists,id'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'paginate' => ['nullable'],
        ]);

        $timezone = 'Asia/Manila';
        $query = Sale::with(['appointment', 'inventory', 'stylist']);

        // Filter by date range
        if ($request->filled('start_date')) {
            $startUtc = Carbon::createFromFormat('Y-m-d', $request->start_date, $timezone)
                ->startOfDay()
                ->setTimezone('UTC');
            $query->where('created_at', '>=', $startUtc);
        }
        if ($request->filled('end_date')) {
            $endUtc = Carbon::createFromFormat('Y-m-d', $request->end_date, $timezone)
                ->endOfDay()
                ->setTimezone('UTC');
            $query->where('created_at', '<=', $endUtc);
        }

        // Filter by transaction type
        if ($request->filled('transaction_type')) {
            $query->where('transaction_type', $request->transaction_type);
        }

        // Filter by stylist
        if ($request->filled('stylist_id')) {
            $query->where('stylist_id', $request->stylist_id);
        }

        $query->orderBy('created_at', 'desc');

        if ($this->shouldPaginate($request)) {
            return response()->json(
                $query->paginate($this->resolvePerPage($request))
            );
        }

        return $query->get();
    }

    public function store(Request $request, InventoryWorkflowService $inventoryWorkflowService)
    {
        $data = $request->validate([
            'appointment_id' => 'nullable|exists:appointments,id',
            'inventory_id' => 'nullable|exists:inventory,id',
            'transaction_type' => 'required|in:service,product,both',
            'item_name' => 'required|string|max:255',
            'quantity' => 'required|integer|min:1',
            'unit_price_cents' => 'required|integer|min:0',
            'payment_method' => 'required|in:cash,gcash,paymaya,card,other',
            'payment_status' => 'nullable|in:pending,paid,refunded',
            'customer_name' => 'nullable|string|max:255',
            'customer_phone' => 'nullable|string|max:255',
            'stylist_id' => 'nullable|exists:stylists,id',
            'notes' => 'nullable|string',
        ]);

        // Calculate total amount
        $data['total_amount_cents'] = $data['quantity'] * $data['unit_price_cents'];
        $data['payment_status'] = $data['payment_status'] ?? 'paid';

        try {
            $sale = DB::transaction(function () use ($data, $inventoryWorkflowService, $request) {
                $sale = Sale::create($data);

                // If inventory item is sold, reduce quantity and log usage.
                if (!empty($data['inventory_id'])) {
                    $inventory = Inventory::findOrFail($data['inventory_id']);
                    $inventoryWorkflowService->applyStockChange(
                        $inventory,
                        -((int) $data['quantity']),
                        'stock_deducted',
                        'sale',
                        (int) $sale->id,
                        $request->user()?->id,
                        'Inventory sold'
                    );
                }

                return $sale;
            });

            return response()->json($sale->load(['appointment', 'inventory', 'stylist']), 201);
        } catch (\RuntimeException $e) {
            if ((int) $e->getCode() === 422) {
                return response()->json(['message' => $e->getMessage()], 422);
            }
            throw $e;
        }
    }

    public function show(Sale $sale)
    {
        return $sale->load(['appointment', 'inventory', 'stylist']);
    }

    public function update(Request $request, Sale $sale)
    {
        $data = $request->validate([
            'payment_status' => 'sometimes|in:pending,paid,refunded',
            'notes' => 'nullable|string',
        ]);

        $sale->update($data);
        return $sale->fresh()->load(['appointment', 'inventory', 'stylist']);
    }

    public function destroy(Request $request, Sale $sale, InventoryWorkflowService $inventoryWorkflowService)
    {
        DB::transaction(function () use ($request, $sale, $inventoryWorkflowService) {
            // If inventory item was sold, restore quantity and log.
            if ($sale->inventory_id) {
                $inventory = Inventory::find($sale->inventory_id);
                if ($inventory) {
                    $inventoryWorkflowService->applyStockChange(
                        $inventory,
                        (int) $sale->quantity,
                        'stock_added',
                        'sale',
                        (int) $sale->id,
                        $request->user()?->id,
                        'Sale deleted, stock restored'
                    );
                }
            }

            $sale->delete();
        });

        return response()->json(['message' => 'Sale deleted successfully']);
    }

    public function stats(Request $request)
    {
        $request->validate([
            'start_date' => ['nullable', 'date_format:Y-m-d'],
            'end_date' => ['nullable', 'date_format:Y-m-d'],
        ]);

        $timezone = 'Asia/Manila';
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
        $baseQuery = Sale::whereBetween('created_at', [$startUtc, $endUtc]);

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
            ->select(['created_at', 'total_amount_cents'])
            ->orderBy('created_at')
            ->get()
            ->groupBy(function ($sale) use ($timezone) {
                return Carbon::parse($sale->created_at)->setTimezone($timezone)->toDateString();
            })
            ->map(function ($items, $date) {
                return [
                    'date' => $date,
                    'total' => (int) $items->sum('total_amount_cents'),
                ];
            })
            ->values();

        return response()->json([
            'period' => [
                'start_date' => $startManila->toDateString(),
                'end_date' => $endManila->toDateString(),
            ],
            'total_sales_cents' => $totalSales,
            'sales_by_type' => $salesByType,
            'sales_by_payment_method' => $salesByPayment,
            'top_selling_items' => $topItems,
            'daily_sales' => $dailySales,
        ]);
    }

    public function exportPdf(Request $request)
    {
        // Re-use stats logic to get summary data
        $statsResponse = $this->stats($request);
        $stats = json_decode($statsResponse->getContent(), true);

        // Re-use index logic to get sales list (without pagination)
        $request->merge(['paginate' => '0']); // Disable pagination for PDF
        $sales = $this->index($request);

        $filters = [
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'transaction_type' => $request->transaction_type,
            'stylist_name' => $request->stylist_id ? (Stylist::find($request->stylist_id)?->name) : null,
        ];

        $pdf = Pdf::loadView('pdf.sales-report', [
            'sales' => $sales,
            'stats' => $stats,
            'filters' => $filters,
            'generated_at' => Carbon::now('Asia/Manila')->format('M d, Y h:i A'),
        ]);

        return $pdf->download('sales-report-' . date('Y-m-d') . '.pdf');
    }
}
