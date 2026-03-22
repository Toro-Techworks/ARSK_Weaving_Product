<?php

namespace App\Http\Concerns;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

trait FormatsPaginatedResponses
{
    /**
     * Clamp per_page from request (default 10, max 100).
     */
    protected function clampPerPage(Request $request, int $default = 10, int $max = 100): int
    {
        $v = (int) $request->input('per_page', $default);

        return $v >= 1 && $v <= $max ? $v : $default;
    }

    /**
     * Larger page size for dropdowns / grids that need more rows in one request (still capped).
     */
    protected function clampPerPageLarge(Request $request, int $default = 50, int $max = 200): int
    {
        $v = (int) $request->input('per_page', $default);

        return $v >= 1 && $v <= $max ? $v : $default;
    }

    /**
     * Standard JSON: data + pagination at root and under meta (for backward compatibility).
     *
     * @param  mixed  $data  Resolved array / JSON-serializable collection
     */
    protected function paginatedResponse(LengthAwarePaginator $paginator, mixed $data): JsonResponse
    {
        $meta = [
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
        ];

        return response()->json(array_merge(
            [
                'data' => $data,
                'meta' => $meta,
            ],
            $meta
        ));
    }
}
