<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$admins = App\Models\Admin::query()->get(['id','email','name','created_at','updated_at']);
echo json_encode($admins, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
