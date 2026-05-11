<?php
$baseDir = dirname(__DIR__);
require $baseDir . '/backend/vendor/autoload.php';
$app = require_once $baseDir . '/backend/bootstrap/app.php';

use App\Models\Setting;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Email Notifications Enabled: " . (Setting::getValue('email_notifications_enabled', true) ? 'YES' : 'NO') . "\n";
echo "Admin Notification Email: " . Setting::getValue('admin_notification_email', 'not set') . "\n";

try {
    echo "Attempting to send test email to ruffasapan@gmail.com...\n";
    Mail::raw('Test email from Salon System', function ($message) {
        $message->to('ruffasapan@gmail.com')->subject('Salon System Test Email');
    });
    echo "Test email sent successfully (or at least no exception thrown).\n";
} catch (\Exception $e) {
    echo "FAILED to send test email: " . $e->getMessage() . "\n";
}
