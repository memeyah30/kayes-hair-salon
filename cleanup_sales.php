<?php

require __DIR__ . '/backend/vendor/autoload.php';
$app = require_once __DIR__ . '/backend/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Sale;
use App\Models\Appointment;
use Illuminate\Support\Facades\DB;

echo "Starting cleanup of Sale records...\n";

// 1. Find all Sale records that belong to an appointment that is NOT completed
$invalidSales = Sale::whereNotNull('appointment_id')
    ->whereHas('appointment', function($query) {
        $query->where('status', '!=', 'completed');
    })
    ->get();

echo "Found " . $invalidSales->count() . " sale records for non-completed appointments.\n";

foreach ($invalidSales as $sale) {
    echo "Deleting Sale ID {$sale->id} (Appointment ID: {$sale->appointment_id}, Status: {$sale->appointment->status}, Amount: {$sale->total_amount_cents})\n";
    $sale->delete();
}

// 2. Check for duplicate Sale records for the same appointment (even if completed)
// We only want one Sale record per service in an appointment.
// But for now, let's just look at the totals.

$todayStart = \Carbon\Carbon::now('Asia/Manila')->startOfDay()->setTimezone('UTC');
$todayEnd = \Carbon\Carbon::now('Asia/Manila')->endOfDay()->setTimezone('UTC');

$todayRevenueCents = Sale::whereBetween('created_at', [$todayStart, $todayEnd])->sum('total_amount_cents');
echo "New Today Revenue: PHP " . number_format($todayRevenueCents / 100, 2) . "\n";

echo "Cleanup finished.\n";
