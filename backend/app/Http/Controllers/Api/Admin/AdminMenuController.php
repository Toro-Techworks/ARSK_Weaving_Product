<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Menu;
use App\Services\MenuService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminMenuController extends Controller
{
    public function __construct(
        private MenuService $menuService
    ) {}

    public function index(): JsonResponse
    {
        $menus = $this->menuService->getAllMenusTree();
        return response()->json(['data' => $menus]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'menu_name' => 'required|string|max:128',
            'menu_key' => 'required|string|max:64|unique:menus,menu_key',
            'route_path' => 'nullable|string|max:255',
            'icon' => 'nullable|string|max:64',
            'parent_id' => 'nullable|exists:menus,id',
            'sort_order' => 'nullable|integer|min:0',
            'status' => 'nullable|in:active,inactive',
        ]);

        $validated['status'] = $validated['status'] ?? 'active';
        $validated['sort_order'] = $validated['sort_order'] ?? 0;
        $menu = Menu::create($validated);
        return response()->json(['data' => $menu], 201);
    }

    public function update(Request $request, Menu $menu): JsonResponse
    {
        $validated = $request->validate([
            'menu_name' => 'sometimes|string|max:128',
            'menu_key' => 'sometimes|string|max:64|unique:menus,menu_key,' . $menu->id,
            'route_path' => 'nullable|string|max:255',
            'icon' => 'nullable|string|max:64',
            'parent_id' => 'nullable|exists:menus,id',
            'sort_order' => 'nullable|integer|min:0',
            'status' => 'nullable|in:active,inactive',
        ]);

        $menu->update($validated);
        return response()->json(['data' => $menu->fresh()]);
    }

    public function listFlat(Request $request): JsonResponse
    {
        $query = Menu::with('parent:id,menu_name')->orderBy('sort_order');
        $perPage = $request->input('per_page');
        if ($perPage !== null && $perPage !== '') {
            $perPage = (int) $perPage;
            $perPage = $perPage >= 1 && $perPage <= 100 ? $perPage : 10;
            $menus = $query->paginate($perPage);
            return response()->json([
                'data' => $menus->items(),
                'meta' => [
                    'current_page' => $menus->currentPage(),
                    'last_page' => $menus->lastPage(),
                    'per_page' => $menus->perPage(),
                    'total' => $menus->total(),
                ],
            ]);
        }
        $menus = $query->get();
        return response()->json(['data' => $menus]);
    }
}
