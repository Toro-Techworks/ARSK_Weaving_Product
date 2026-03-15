<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\LoomResource;
use App\Models\Loom;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LoomController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->input('per_page', 15);
        $looms = Loom::query()
            ->when($request->search, fn ($q) => $q->where('loom_number', 'like', "%{$request->search}%")
                ->orWhere('location', 'like', "%{$request->search}%"))
            ->orderBy('loom_number')
            ->paginate($perPage);

        return response()->json([
            'data' => LoomResource::collection($looms),
            'meta' => [
                'current_page' => $looms->currentPage(),
                'last_page' => $looms->lastPage(),
                'per_page' => $looms->perPage(),
                'total' => $looms->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'loom_number' => 'required|string|max:50|unique:looms,loom_number',
            'location' => 'nullable|string|max:255',
            'status' => 'nullable|in:Active,Inactive',
        ]);

        $loom = Loom::create($validated);
        return response()->json(['data' => new LoomResource($loom)], 201);
    }

    public function show(Loom $loom): JsonResponse
    {
        return response()->json(['data' => new LoomResource($loom)]);
    }

    public function update(Request $request, Loom $loom): JsonResponse
    {
        $validated = $request->validate([
            'loom_number' => 'sometimes|string|max:50|unique:looms,loom_number,' . $loom->id,
            'location' => 'nullable|string|max:255',
            'status' => 'nullable|in:Active,Inactive',
        ]);

        $loom->update($validated);
        return response()->json(['data' => new LoomResource($loom->fresh())]);
    }

    public function destroy(Loom $loom): JsonResponse
    {
        $loom->delete();
        return response()->json(['message' => 'Loom deleted successfully']);
    }

    public function list(): JsonResponse
    {
        $looms = Loom::select(['id', 'loom_number'])
            ->where('status', 'Active')
            ->orderBy('loom_number')
            ->get();
        return response()->json(['data' => $looms]);
    }
}
