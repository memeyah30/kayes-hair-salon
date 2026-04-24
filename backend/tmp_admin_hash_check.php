<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Hash;

$admin = App\Models\Admin::where('email', 'admin')->first(['id','email','password']);
$stored = $admin?->password;
echo json_encode([
  'id' => $admin?->id,
  'email' => $admin?->email,
  'password_prefix' => is_string($stored) ? substr($stored, 0, 20) : null,
  'password_length' => is_string($stored) ? strlen($stored) : null,
  'hash_check' => is_string($stored) ? Hash::check('admin123', $stored) : null,
  'password_hash_verify' => is_string($stored) ? password_verify('admin123', $stored) : null,
  'password_hash_info' => is_string($stored) ? password_get_info($stored) : null,
  'custom_matches' => is_string($stored) ? App\Support\PasswordHash::matches('admin123', $stored) : null,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
