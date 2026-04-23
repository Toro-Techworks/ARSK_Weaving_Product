<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\WeaverResource;
use App\Models\GenericCode;
use App\Models\Weaver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class WeaverController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $this->clampPerPage($request, 10, 100);
        $weavers = Weaver::query()
            ->when($request->search, function ($q) use ($request) {
                $term = $request->search;
                $q->where('weaver_name', 'like', "%{$term}%")
                    ->orWhere('employee_code', 'like', "%{$term}%")
                    ->orWhere('phone', 'like', "%{$term}%");
            })
            ->orderBy('weaver_name')
            ->paginate($perPage);

        return $this->paginatedResponse(
            $weavers,
            WeaverResource::collection($weavers->items())->resolve()
        );
    }

    public function deletedIndex(Request $request): JsonResponse
    {
        $perPage = $this->clampPerPage($request, 10, 100);
        $weavers = Weaver::onlyTrashed()
            ->when($request->search, function ($q) use ($request) {
                $term = $request->search;
                $q->where('weaver_name', 'like', "%{$term}%")
                    ->orWhere('employee_code', 'like', "%{$term}%")
                    ->orWhere('phone', 'like', "%{$term}%");
            })
            ->orderByDesc('deleted_at')
            ->paginate($perPage);

        return $this->paginatedResponse(
            $weavers,
            WeaverResource::collection($weavers->items())->resolve()
        );
    }

    public function restoreTrashed(int $id): JsonResponse
    {
        $weaver = Weaver::onlyTrashed()->findOrFail($id);
        $weaver->restore();

        return response()->json([
            'message' => 'Weaver restored.',
            'data' => new WeaverResource($weaver->fresh()),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('weavers', 'employee_code')->whereNull('deleted_at'),
            ],
            'weaver_name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'joining_date' => 'nullable|date',
            'status' => GenericCode::validationRule('active_inactive'),
        ]);

        $weaver = Weaver::create($validated);

        return response()->json(['data' => new WeaverResource($weaver)], 201);
    }

    public function show(Weaver $weaver): JsonResponse
    {
        return response()->json(['data' => new WeaverResource($weaver)]);
    }

    public function update(Request $request, Weaver $weaver): JsonResponse
    {
        $validated = $request->validate([
            'employee_code' => [
                'sometimes',
                'required',
                'string',
                'max:50',
                Rule::unique('weavers', 'employee_code')->ignore($weaver->id)->whereNull('deleted_at'),
            ],
            'weaver_name' => 'sometimes|required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'joining_date' => 'nullable|date',
            'status' => GenericCode::validationRule('active_inactive'),
        ]);

        $weaver->update($validated);

        return response()->json(['data' => new WeaverResource($weaver->fresh())]);
    }

    public function destroy(Weaver $weaver): JsonResponse
    {
        $weaver->delete();

        return response()->json(['message' => 'Weaver deleted successfully']);
    }
}
