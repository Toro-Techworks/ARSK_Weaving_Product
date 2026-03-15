<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken as Middleware;

class VerifyCsrfToken extends Middleware
{
    /**
     * The URIs that should be excluded from CSRF verification.
     * API routes use Bearer token auth; exclude them to avoid token mismatch in production.
     * Do not disable CSRF globally.
     */
    protected $except = [
        'api/*',
        'sanctum/csrf-cookie',
    ];
}
