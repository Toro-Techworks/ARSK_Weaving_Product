<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * requireAuth: already applied via auth:sanctum.
     * requireRole("super_admin"), requireRole("admin") etc.
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        if (!$request->user()) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if (!in_array($request->user()->role_name, $roles)) {
            return response()->json(['message' => 'Unauthorized. Insufficient role.'], 403);
        }

        return $next($request);
    }
}
