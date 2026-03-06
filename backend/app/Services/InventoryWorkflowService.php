<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Inventory;
use App\Models\InventoryUsageLog;
use App\Models\ServiceInventoryRequirement;
use Illuminate\Support\Collection;

class InventoryWorkflowService
{
    public function applyStockChange(
        Inventory $inventory,
        int $quantityDelta,
        string $actionType,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?int $userId = null,
        ?string $notes = null
    ): Inventory {
        $lockedItem = Inventory::query()
            ->whereKey($inventory->id)
            ->lockForUpdate()
            ->firstOrFail();

        $quantityBefore = (int) $lockedItem->quantity;
        $quantityAfter = $quantityBefore + $quantityDelta;

        if ($quantityAfter < 0) {
            throw new \RuntimeException(
                "Insufficient stock for {$lockedItem->name}. Available: {$quantityBefore}, required: " . abs($quantityDelta),
                422
            );
        }

        $lockedItem->quantity = $quantityAfter;
        $lockedItem->save();

        $this->recordUsage(
            $lockedItem,
            $actionType,
            $quantityDelta,
            $referenceType,
            $referenceId,
            $userId,
            $notes,
            $quantityBefore,
            $quantityAfter
        );

        return $lockedItem->fresh();
    }

    public function recordUsage(
        Inventory $inventory,
        string $actionType,
        int $quantityChanged,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?int $userId = null,
        ?string $notes = null,
        ?int $quantityBefore = null,
        ?int $quantityAfter = null
    ): InventoryUsageLog {
        return InventoryUsageLog::create([
            'inventory_id' => $inventory->id,
            'action_type' => $actionType,
            'quantity_changed' => $quantityChanged,
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'user_id' => $userId,
            'quantity_before' => $quantityBefore,
            'quantity_after' => $quantityAfter,
            'notes' => $notes,
        ]);
    }

    /**
     * Deduct mapped inventory for a completed appointment.
     *
     * @return array<int, array{inventory_id:int,name:string,quantity_deducted:int,quantity_after:int}>
     */
    public function deductForCompletedAppointment(
        Appointment $appointment,
        Collection $appointmentServices,
        ?int $userId = null
    ): array {
        $serviceIds = $appointmentServices
            ->pluck('id')
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->values();

        if ($serviceIds->isEmpty()) {
            return [];
        }

        $requirements = ServiceInventoryRequirement::query()
            ->whereIn('service_id', $serviceIds)
            ->where('is_active', true)
            ->get();

        if ($requirements->isEmpty()) {
            return [];
        }

        $serviceCounts = $appointmentServices->countBy(fn ($service) => (int) $service->id);
        $requiredByInventory = [];

        foreach ($requirements as $requirement) {
            $serviceId = (int) $requirement->service_id;
            $serviceCount = (int) ($serviceCounts[$serviceId] ?? 0);
            if ($serviceCount <= 0) {
                continue;
            }

            $requiredQuantity = (int) $requirement->quantity_required * $serviceCount;
            if ($requiredQuantity <= 0) {
                continue;
            }

            $inventoryId = (int) $requirement->inventory_id;
            if (!isset($requiredByInventory[$inventoryId])) {
                $requiredByInventory[$inventoryId] = [
                    'quantity' => 0,
                    'service_ids' => [],
                ];
            }

            $requiredByInventory[$inventoryId]['quantity'] += $requiredQuantity;
            $requiredByInventory[$inventoryId]['service_ids'][] = $serviceId;
        }

        if (empty($requiredByInventory)) {
            return [];
        }

        $serviceNameById = $appointmentServices
            ->keyBy('id')
            ->map(fn ($service) => (string) $service->name);

        $deductions = [];
        foreach ($requiredByInventory as $inventoryId => $payload) {
            $inventory = Inventory::findOrFail((int) $inventoryId);
            $quantity = (int) $payload['quantity'];
            $serviceNames = collect($payload['service_ids'])
                ->unique()
                ->map(fn ($id) => $serviceNameById->get($id))
                ->filter()
                ->values()
                ->all();

            $updatedInventory = $this->applyStockChange(
                $inventory,
                -$quantity,
                'used_in_service',
                'service',
                (int) $appointment->id,
                $userId,
                'Used for completed appointment #' . $appointment->id
                . (count($serviceNames) > 0 ? ' (' . implode(', ', $serviceNames) . ')' : '')
            );

            $deductions[] = [
                'inventory_id' => (int) $updatedInventory->id,
                'name' => (string) $updatedInventory->name,
                'quantity_deducted' => $quantity,
                'quantity_after' => (int) $updatedInventory->quantity,
            ];
        }

        return $deductions;
    }
}
