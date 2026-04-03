<?php

$origins = env('CORS_ORIGINS', env('SPA_URL', 'http://localhost:5173'));
$allowed_origins = array_filter(array_map('trim', explode(',', $origins)));

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'broadcasting/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => $allowed_origins,
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
