<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GenericCode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GenericCodeController extends Controller
{
    /**
     * GET /api/generic-code/{codeType}
     * codeType may use hyphens (e.g. yarn-receipt-type) or underscores (yarn_receipt_type).
     */
    public function byType(Request $request, string $codeType): JsonResponse
    {
        $normalized = str_replace('-', '_', $codeType);
        $includeInactive = $request->boolean('include_inactive')
            && $request->user()?->hasAnyRole(['super_admin', 'admin']);

        $requestedDt = strtoupper((string) $request->query('dropdown_type', ''));
        $masterRequested = $requestedDt === GenericCode::DROPDOWN_TYPE_MASTER;

        if ($masterRequested) {
            $q = GenericCode::query()
                ->where('code_type', $normalized)
                ->where('dropdown_type', GenericCode::DROPDOWN_TYPE_MASTER)
                ->orderBy('sort_order')
                ->orderBy('code_description');
            if (! $includeInactive) {
                $q->active();
            }
            $fields = ['id', 'code_type', 'code_description', 'dropdown_type', 'sort_order'];
            if ($includeInactive) {
                $fields[] = 'is_active';
            }
            $items = $q->get($fields)->map(fn ($r) => $r->toArray())->values()->all();

            return response()->json(['data' => $items]);
        }

        if ($includeInactive) {
            // Admin-only: list may include inactive CORE rows for troubleshooting.
            $items = GenericCode::query()
                ->where('code_type', $normalized)
                ->where('dropdown_type', GenericCode::DROPDOWN_TYPE_CORE)
                ->orderBy('sort_order')
                ->orderBy('code_description')
                ->get(['id', 'code_type', 'code_description', 'dropdown_type', 'sort_order', 'is_active']);

            return response()->json(['data' => $items]);
        }

        // Default: active CORE codes only (cached).
        return response()->json(['data' => GenericCode::activeListForType($normalized)]);
    }
}
