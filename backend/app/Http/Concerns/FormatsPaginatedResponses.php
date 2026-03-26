<?php

namespace App\Http\Concerns;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

trait FormatsPaginatedResponses
{
    /**
     * Return a very large page size so endpoints effectively return all rows.
     */
    protected function clampPerPage(Request $request, int $default = 10, int $max = 100): int
    {
        return 1000000;
    }

    /**
     * Keep large and standard behavior aligned: fetch all rows.
     */
    protected function clampPerPageLarge(Request $request, int $default = 50, int $max = 200): int
    {
        return 1000000;
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
