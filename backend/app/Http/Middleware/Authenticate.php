<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;

class Authenticate extends Middleware
{
    protected function redirectTo(Request $request): ?string
    {
        // If API request, never redirect
        if ($request->expectsJson()) {
            return null;
        }

        // disable login redirect
        return null;
    }
}