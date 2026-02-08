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
        $query = Sale::with(['appointment', 'inventory', 'stylist']);

        // Filter by date range
        if ($request->has('start_date')) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }
        if ($request->has('end_date')) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }

        // Filter by transaction type
        if ($request->has('transaction_type')) {
            $query->where('transaction_type', $request->transaction_type);
        }

        // Filter by stylist
        if ($request->has('stylist_id')) {
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
        $startDate = $request->start_date ?? Carbon::now()->startOfMonth()->toDateString();
        $endDate = $request->end_date ?? Carbon::now()->endOfMonth()->toDateString();

        // Use date-based filtering (same as /sales listing) to avoid timezone drift
        $baseQuery = Sale::whereDate('created_at', '>=', $startDate)
            ->whereDate('created_at', '<=', $endDate);

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

        // Daily sales
        $dailySales = (clone $baseQuery)
            ->select(DB::raw('DATE(created_at) as date'), DB::raw('SUM(total_amount_cents) as total'))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return response()->json([
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'total_sales_cents' => $totalSales,
            'sales_by_type' => $salesByType,
            'sales_by_payment_method' => $salesByPayment,
            'top_selling_items' => $topItems,
            'daily_sales' => $dailySales,
        ]);
    }
}
