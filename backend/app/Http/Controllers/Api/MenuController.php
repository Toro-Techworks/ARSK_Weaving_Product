<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Menu;
use App\Services\MenuService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MenuController extends Controller
{
    public function __construct(
        private MenuService $menuService
    ) {}

    public function userMenus(Request $request): JsonResponse
    {
        $user = $request->user();
        $menus = $this->menuService->getMenusForUser($user);
        $permissions = $this->menuService->getPermissionsForUser($user);
        return response()->json([
            'data' => $menus,
            'permissions' => $permissions,
        ]);
    }
}
