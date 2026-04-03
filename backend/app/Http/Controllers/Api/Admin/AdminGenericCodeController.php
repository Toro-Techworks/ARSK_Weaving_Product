<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\GenericCode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminGenericCodeController extends Controller
{
    /**
     * Distinct code_type values for filters and grouping (register before apiResource).
     * Optional query: dropdown_type — when set, only types that have at least one row with that value.
     */
    public function codeTypes(Request $request): JsonResponse
    {
        $q = GenericCode::query();
        if ($request->filled('dropdown_type')) {
            $q->where('dropdown_type', $request->string('dropdown_type'));
        }
        $types = $q
            ->select('code_type')
            ->distinct()
            ->orderBy('code_type')
            ->pluck('code_type')
            ->values();

        return response()->json(['data' => $types]);
    }

    public function index(Request $request): JsonResponse
    {
        $q = GenericCode::query()->orderBy('code_type')->orderBy('sort_order')->orderBy('code_description');
        if ($request->filled('dropdown_type')) {
            $q->where('dropdown_type', $request->string('dropdown_type'));
        }
        if ($request->filled('code_type')) {
            $q->where('code_type', $request->string('code_type'));
        }
        if ($request->filled('code_description')) {
            $term = addcslashes($request->string('code_description'), '%_\\');
            $q->where('code_description', 'like', '%'.$term.'%');
        }
        $rows = $q->paginate($this->clampPerPage($request, 10, 200));

        return $this->paginatedResponse($rows, $rows->items());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code_type' => 'required|string|max:64',
            'code_description' => [
                'required',
                'string',
                'max:255',
                Rule::unique('generic_codes', 'code_description')->where(fn ($q) => $q->where('code_type', $request->input('code_type'))),
            ],
            'dropdown_type' => 'nullable|string|max:64',
            'sort_order' => 'nullable|integer|min:0|max:65535',
            'is_active' => 'sometimes|boolean',
        ]);
        $validated['dropdown_type'] = $validated['dropdown_type'] ?? 'CORE';
        $validated['sort_order'] = $validated['sort_order'] ?? 0;
        $validated['is_active'] = $validated['is_active'] ?? true;
        $row = GenericCode::create($validated);

        return response()->json(['data' => $row], 201);
    }

    public function update(Request $request, GenericCode $genericCode): JsonResponse
    {
        $validated = $request->validate([
            'code_type' => 'sometimes|required|string|max:64',
            'code_description' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('generic_codes', 'code_description')
                    ->where('code_type', $request->input('code_type', $genericCode->code_type))
                    ->ignore($genericCode->id),
            ],
            'dropdown_type' => 'sometimes|string|max:64',
            'sort_order' => 'nullable|integer|min:0|max:65535',
            'is_active' => 'sometimes|boolean',
        ]);
        $oldType = $genericCode->code_type;
        $genericCode->update($validated);
        GenericCode::forgetCacheForType($oldType);
        if (isset($validated['code_type']) && $validated['code_type'] !== $oldType) {
            GenericCode::forgetCacheForType($validated['code_type']);
        }

        return response()->json(['data' => $genericCode->fresh()]);
    }

    public function destroy(GenericCode $genericCode): JsonResponse
    {
        $type = $genericCode->code_type;
        $genericCode->delete();
        GenericCode::forgetCacheForType($type);

        return response()->json(['message' => 'Deleted']);
    }
}
