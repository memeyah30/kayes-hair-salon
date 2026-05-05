<?php
// Fix previous completed appointments
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$appointments = App\Models\Appointment::where('status', 'completed')->get();

$fixedCount = 0;
foreach ($appointments as $appointment) {
    if ($appointment->remaining_balance_cents > 0) {
        $appointment->update([
            'payment_status' => 'paid',
            'downpayment_amount_cents' => $appointment->total_amount_cents,
        ]);
        $fixedCount++;
    }
}
echo "Fixed " . $fixedCount . " appointments.\n";
