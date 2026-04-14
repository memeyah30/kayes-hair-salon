<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$request = Illuminate\Http\Request::create('/api/stylists/by-services', 'GET', ['services' => [5]]);
$controller = app(App\Http\Controllers\Public\StylistController::class);
$response = $controller->byServices($request);
echo $response->getContent();
