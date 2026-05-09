<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Sale;
use App\Models\Appointment;
use Carbon\Carbon;

$startDate = '2026-05-01';
$endDate = '2026-05-10';

$start = Carbon::parse($startDate)->startOfDay();
$end = Carbon::parse($endDate)->endOfDay();

$sales = Sale::whereBetween('created_at', [$start, $end])->get();
$totalSales = $sales->sum('total_amount_cents');

$appointments = Appointment::whereBetween('created_at', [$start, $end])->get();
$totalCollected = $appointments->sum('amount_paid_cents');
$totalBalance = $appointments->sum('remaining_balance_cents');

$dpTotal = $appointments->where('mode_of_payment', 'downpayment')->sum('amount_paid_cents');
$fullTotal = $appointments->where('mode_of_payment', 'full')->sum('amount_paid_cents');

echo "--- Summary Stats ---\n";
echo "Total Sales: " . ($totalSales / 100) . "\n";
echo "Total Collected: " . ($totalCollected / 100) . "\n";
echo "Total Balance: " . ($totalBalance / 100) . "\n";
echo "Downpayments: " . ($dpTotal / 100) . "\n";
echo "Full Payments: " . ($fullTotal / 100) . "\n\n";

echo "--- Transaction Breakdown ---\n";
foreach ($sales as $sale) {
    echo "Sale #{$sale->id}: {$sale->customer_name} - " . ($sale->total_amount_cents / 100) . " ({$sale->item_name})\n";
}
