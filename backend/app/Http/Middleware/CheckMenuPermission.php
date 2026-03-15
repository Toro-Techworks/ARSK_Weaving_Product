<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckMenuPermission
{
    public function handle(Request $request, Closure $next, string $menuKey, string $action = 'view'): Response
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        if (!$user->hasMenuPermission($menuKey, $action)) {
            return response()->json(['message' => 'Unauthorized. No permission for this action.'], 403);
        }

        return $next($request);
    }
}
