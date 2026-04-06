<?php

return [
    // Comma-separated hostnames for cookie-based SPA auth only. Leave empty when using Bearer tokens only.
    'stateful' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('SANCTUM_STATEFUL_DOMAINS', ''))
    ))),
    'guard' => ['web'],
    'expiration' => null,
    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),
    'middleware' => [
        'authenticate_session' => Laravel\Sanctum\Http\Middleware\AuthenticateSession::class,
        'encrypt_cookies' => Illuminate\Cookie\Middleware\EncryptCookies::class,
        'validate_csrf_token' => \App\Http\Middleware\VerifyCsrfToken::class,
    ],
];
