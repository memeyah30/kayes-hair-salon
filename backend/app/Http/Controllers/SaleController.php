<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\Inventory;
use App\Models\Appointment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class SaleController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'start_date' => ['nullable', 'date_format:Y-m-d'],
            'end_date' => ['nullable', 'date_format:Y-m-d'],
            'transaction_type' => ['nullable', 'in:service,product,both'],
            'stylist_id' => ['nullable', 'integer', 'exists:stylists,id'],
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

        return $query->orderBy('created_at', 'desc')->get();
    }

    public function store(Request $request)
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

        // If inventory item is sold, reduce quantity
        if ($data['inventory_id']) {
            $inventory = Inventory::findOrFail($data['inventory_id']);
            if ($inventory->quantity < $data['quantity']) {
                return response()->json([
                    'message' => 'Insufficient inventory. Available: ' . $inventory->quantity
                ], 422);
            }
            $inventory->quantity -= $data['quantity'];
            $inventory->save();
        }

        $sale = Sale::create($data);
        return response()->json($sale->load(['appointment', 'inventory', 'stylist']), 201);
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

    public function destroy(Sale $sale)
    {
        // If inventory item was sold, restore quantity
        if ($sale->inventory_id) {
            $inventory = Inventory::find($sale->inventory_id);
            if ($inventory) {
                $inventory->quantity += $sale->quantity;
                $inventory->save();
            }
        }

        $sale->delete();
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
}
