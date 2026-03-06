<?php

namespace App\Http\Controllers;

use App\Models\InventoryUsageLog;
use App\Models\Inventory;
use App\Services\InventoryWorkflowService;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    public function index()
    {
        return Inventory::orderBy('name')->get();
    }

    public function store(Request $request, InventoryWorkflowService $inventoryWorkflowService)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:255',
            'sku' => 'nullable|string|max:255|unique:inventory,sku',
            'quantity' => 'required|integer|min:0',
            'min_stock_level' => 'nullable|integer|min:0',
            'unit_price_cents' => 'required|integer|min:0',
            'selling_price_cents' => 'required|integer|min:0',
            'unit' => 'nullable|string|max:50',
            'supplier' => 'nullable|string|max:255',
            'expiry_date' => 'nullable|date',
            'is_active' => 'boolean',
        ]);

        $inventory = Inventory::create($data);

        if ((int) $inventory->quantity > 0) {
            $inventoryWorkflowService->recordUsage(
                $inventory,
                'stock_added',
                (int) $inventory->quantity,
                'manual',
                (int) $inventory->id,
                $request->user()?->id,
                'Initial stock entry',
                0,
                (int) $inventory->quantity
            );
        }

        return $inventory->fresh();
    }

    public function update(Request $request, Inventory $inventory, InventoryWorkflowService $inventoryWorkflowService)
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:255',
            'sku' => 'nullable|string|max:255|unique:inventory,sku,' . $inventory->id,
            'quantity' => 'sometimes|integer|min:0',
            'min_stock_level' => 'nullable|integer|min:0',
            'unit_price_cents' => 'sometimes|integer|min:0',
            'selling_price_cents' => 'sometimes|integer|min:0',
            'unit' => 'nullable|string|max:50',
            'supplier' => 'nullable|string|max:255',
            'expiry_date' => 'nullable|date',
            'is_active' => 'boolean',
        ]);

        $quantityBefore = (int) $inventory->quantity;
        $inventory->update($data);

        if (array_key_exists('quantity', $data)) {
            $quantityAfter = (int) $inventory->quantity;
            $quantityDelta = $quantityAfter - $quantityBefore;

            if ($quantityDelta !== 0) {
                $inventoryWorkflowService->recordUsage(
                    $inventory,
                    'manual_adjustment',
                    $quantityDelta,
                    'manual',
                    (int) $inventory->id,
                    $request->user()?->id,
                    'Manual stock adjustment from inventory update'
                    . ($quantityDelta > 0 ? ' (increase)' : ' (decrease)'),
                    $quantityBefore,
                    $quantityAfter
                );
            }
        }

        return $inventory->fresh();
    }

    public function destroy(Inventory $inventory)
    {
        $inventory->delete();
        return response()->json(['message' => 'Inventory item deleted successfully']);
    }

    public function lowStock()
    {
        return Inventory::lowStock()
            ->where('is_active', true)
            ->orderBy('quantity')
            ->get();
    }

    public function stats()
    {
        $totalItems = Inventory::count();
        $activeItems = Inventory::where('is_active', true)->count();
        $lowStockItems = Inventory::lowStock()
            ->where('is_active', true)
            ->count();
        $totalValue = Inventory::where('is_active', true)
            ->sum(\DB::raw('quantity * unit_price_cents'));
        $lowStockAlerts = Inventory::query()
            ->lowStock()
            ->where('is_active', true)
            ->orderBy('quantity')
            ->limit(10)
            ->get(['id', 'name', 'quantity', 'min_stock_level']);

        return response()->json([
            'total_items' => $totalItems,
            'active_items' => $activeItems,
            'low_stock_items' => $lowStockItems,
            'total_inventory_value_cents' => $totalValue,
            'low_stock_alerts' => $lowStockAlerts,
        ]);
    }

    public function usageLogs(Request $request)
    {
        $data = $request->validate([
            'inventory_id' => 'nullable|integer|exists:inventory,id',
            'action_type' => 'nullable|string|max:50',
            'reference_type' => 'nullable|string|max:50',
            'start_date' => 'nullable|date_format:Y-m-d',
            'end_date' => 'nullable|date_format:Y-m-d',
            'limit' => 'nullable|integer|min:1|max:500',
        ]);

        $query = InventoryUsageLog::with('inventory:id,name');

        if (!empty($data['inventory_id'])) {
            $query->where('inventory_id', $data['inventory_id']);
        }
        if (!empty($data['action_type'])) {
            $query->where('action_type', $data['action_type']);
        }
        if (!empty($data['reference_type'])) {
            $query->where('reference_type', $data['reference_type']);
        }
        if (!empty($data['start_date'])) {
            $query->whereDate('created_at', '>=', $data['start_date']);
        }
        if (!empty($data['end_date'])) {
            $query->whereDate('created_at', '<=', $data['end_date']);
        }

        $limit = (int) ($data['limit'] ?? 200);

        return $query
            ->latest('created_at')
            ->limit($limit)
            ->get();
    }
}
