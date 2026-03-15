<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class PerformanceLogMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $start = microtime(true);
        $response = $next($request);
        $duration = round((microtime(true) - $start) * 1000, 2);
        $method = $request->method();
        $uri = $request->path();
        $status = $response->getStatusCode();
        Log::channel('single')->info('API performance', [
            'method' => $method,
            'uri' => $uri,
            'status' => $status,
            'duration_ms' => $duration,
        ]);
        return $response;
    }
}
