<?php

namespace App\Http\Controllers;

use App\Models\Inventory;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    public function index()
    {
        return Inventory::orderBy('name')->get();
    }

    public function store(Request $request)
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

        return Inventory::create($data);
    }

    public function update(Request $request, Inventory $inventory)
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

        $inventory->update($data);
        return $inventory->fresh();
    }

    public function destroy(Inventory $inventory)
    {
        $inventory->delete();
        return response()->json(['message' => 'Inventory item deleted successfully']);
    }

    public function lowStock()
    {
        return Inventory::whereColumn('quantity', '<=', 'min_stock_level')
            ->where('is_active', true)
            ->orderBy('quantity')
            ->get();
    }

    public function stats()
    {
        $totalItems = Inventory::count();
        $activeItems = Inventory::where('is_active', true)->count();
        $lowStockItems = Inventory::whereColumn('quantity', '<=', 'min_stock_level')
            ->where('is_active', true)
            ->count();
        $totalValue = Inventory::where('is_active', true)
            ->sum(\DB::raw('quantity * unit_price_cents'));

        return response()->json([
            'total_items' => $totalItems,
            'active_items' => $activeItems,
            'low_stock_items' => $lowStockItems,
            'total_inventory_value_cents' => $totalValue,
        ]);
    }
}
