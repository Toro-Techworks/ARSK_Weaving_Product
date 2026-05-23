<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureProductOwner
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->isProductOwner()) {
            return response()->json(['message' => 'Product owner access required.'], 403);
        }

        return $next($request);
    }
}
