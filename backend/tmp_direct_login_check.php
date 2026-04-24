<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$request = Illuminate\Http\Request::create('/login', 'POST', [
    'email' => 'admin',
    'password' => 'admin123',
    'type' => 'admin',
]);
$request->setLaravelSession(app('session')->driver());

try {
    $response = app(App\Http\Controllers\AuthController::class)->login($request);
    echo $response->getContent();
} catch (Throwable $e) {
    echo get_class($e) . PHP_EOL;
    echo $e->getMessage() . PHP_EOL;
}
