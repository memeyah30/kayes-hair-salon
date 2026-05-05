<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$response = $kernel->handle(
    $request = Illuminate\Http\Request::create('/api/public/ratings', 'GET')
);
echo "RESPONSE STATUS: " . $response->getStatusCode() . "\n";
echo "RESPONSE CONTENT: " . $response->getContent() . "\n";

echo "DIRECT DB QUERY:\n";
$ratings = \App\Models\CustomerRating::where('rating', '>=', 4)
    ->whereNotNull('comment')
    ->latest()
    ->get(['id', 'customer_name', 'rating', 'comment', 'created_at']);
echo json_encode($ratings) . "\n";
