<?php

require __DIR__ . '/backend/vendor/autoload.php';
$app = require_once __DIR__ . '/backend/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Sale;
use Illuminate\Support\Facades\DB;

echo "Analyzing Sale records for duplicates...\n";

// Find duplicates based on appointment_id and item_name
$duplicates = DB::table('sales')
    ->select('appointment_id', 'item_name', DB::raw('COUNT(*) as count'), DB::raw('MIN(id) as keep_id'))
    ->whereNotNull('appointment_id')
    ->groupBy('appointment_id', 'item_name')
    ->having('count', '>', 1)
    ->get();

echo "Found " . $duplicates->count() . " sets of duplicate records.\n";

$totalDeleted = 0;
foreach ($duplicates as $dup) {
    $deleted = DB::table('sales')
        ->where('appointment_id', $dup->appointment_id)
        ->where('item_name', $dup->item_name)
        ->where('id', '!=', $dup->keep_id)
        ->delete();
    
    $totalDeleted += $deleted;
    echo "Cleaned Appointment #{$dup->appointment_id} - '{$dup->item_name}': Deleted {$deleted} duplicates.\n";
}

echo "Total records deleted: {$totalDeleted}\n";

$remainingCount = Sale::count();
echo "Remaining Sale records: {$remainingCount}\n";
