<?php

$defaultAllowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:8000',
    'http://localhost:8000',
    'https://tholits-system-capstone.vercel.app',
    'https://kayes-hair-salon.vercel.app',
];

$configuredAllowedOrigins = array_values(array_filter(array_map(
    static fn ($origin) => trim($origin),
    explode(',', (string) env('CORS_ALLOWED_ORIGINS', ''))
)));

$frontendUrl = trim((string) env('FRONTEND_URL', ''));

return [

    'paths' => [
        // The SPA talks directly to Laravel "web" routes like /services,
        // /ratings, /appointments, and /admin/notifications from Vercel.
        // Restrict origins, but apply CORS headers to every route.
        '*',
    ],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_unique(array_filter([
        ...$defaultAllowedOrigins,
        $frontendUrl,
        ...$configuredAllowedOrigins,
    ]))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
