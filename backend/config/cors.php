<?php

return [

    'paths' => [
        'api/*',
        'sanctum/csrf-cookie',
        'services',
        'stylists',
        'payment-accounts',
        'services/*',
        'stylists/*',
        'payment-accounts/*',
    ],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'http://127.0.0.1:8000',
        'http://localhost:8000',
        'https://tholits-system-capstone.vercel.app',
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];