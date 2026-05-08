<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GenericCode;
use Illuminate\Http\JsonResponse;

/**
 * Thin read-only masters for Daily Entry and similar UIs.
 * Response: [ { "id": int, "name": string } ] (no wrapper).
 */
class MasterController extends Controller
{
    public function designs(): JsonResponse
    {
        return response()->json($this->masterNameList('design'));
    }

    public function weaveTech(): JsonResponse
    {
        return response()->json($this->masterNameList('weave_technique'));
    }

    public function colours(): JsonResponse
    {
        return response()->json($this->masterNameList('colour'));
    }

    /**
     * @return list<array{id:int,name:string}>
     */
    private function masterNameList(string $codeType): array
    {
        return GenericCode::query()
            ->where('code_type', $codeType)
            ->where('dropdown_type', GenericCode::DROPDOWN_TYPE_MASTER)
            ->active()
            ->orderBy('sort_order')
            ->orderBy('code_description')
            ->get(['id', 'code_description'])
            ->map(fn ($r) => ['id' => (int) $r->id, 'name' => (string) $r->code_description])
            ->values()
            ->all();
    }
}
