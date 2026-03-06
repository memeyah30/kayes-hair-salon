<?php

namespace App\Http\Controllers;

use App\Models\Service;
use App\Models\ServiceInventoryRequirement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ServiceInventoryRequirementController extends Controller
{
    public function index(Service $service)
    {
        return ServiceInventoryRequirement::query()
            ->with('inventory:id,name,sku,unit,quantity,min_stock_level')
            ->where('service_id', $service->id)
            ->orderBy('id')
            ->get();
    }

    public function sync(Request $request, Service $service)
    {
        $data = $request->validate([
            'mappings' => 'required|array',
            'mappings.*.inventory_id' => 'required|integer|exists:inventory,id',
            'mappings.*.quantity_required' => 'required|integer|min:1',
            'mappings.*.is_active' => 'nullable|boolean',
        ]);

        $normalizedMappings = collect($data['mappings'])
            ->map(function ($row) {
                return [
                    'inventory_id' => (int) $row['inventory_id'],
                    'quantity_required' => (int) $row['quantity_required'],
                    'is_active' => array_key_exists('is_active', $row) ? (bool) $row['is_active'] : true,
                ];
            })
            ->keyBy('inventory_id')
            ->values();

        DB::transaction(function () use ($service, $normalizedMappings) {
            $existing = ServiceInventoryRequirement::query()
                ->where('service_id', $service->id)
                ->get()
                ->keyBy('inventory_id');

            $incomingIds = $normalizedMappings->pluck('inventory_id')->all();

            foreach ($normalizedMappings as $mapping) {
                /** @var ServiceInventoryRequirement|null $current */
                $current = $existing->get($mapping['inventory_id']);
                if ($current) {
                    $current->update([
                        'quantity_required' => $mapping['quantity_required'],
                        'is_active' => $mapping['is_active'],
                    ]);
                    continue;
                }

                ServiceInventoryRequirement::create([
                    'service_id' => $service->id,
                    'inventory_id' => $mapping['inventory_id'],
                    'quantity_required' => $mapping['quantity_required'],
                    'is_active' => $mapping['is_active'],
                ]);
            }

            ServiceInventoryRequirement::query()
                ->where('service_id', $service->id)
                ->when(
                    count($incomingIds) > 0,
                    fn ($query) => $query->whereNotIn('inventory_id', $incomingIds)
                )
                ->delete();
        });

        return $this->index($service);
    }
}

