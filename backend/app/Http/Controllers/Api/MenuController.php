<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\MenuService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class MenuController extends Controller
{
    public function __construct(
        private MenuService $menuService
    ) {}

    public function userMenus(Request $request): JsonResponse
    {
        $user = $request->user();
        $cacheKey = 'user_menus_' . $user->id;
        $cached = Cache::get($cacheKey);
        if ($cached !== null) {
            return response()->json($cached);
        }
        $menus = $this->menuService->getMenusForUser($user);
        $permissions = $this->menuService->getPermissionsForUser($user);
        $payload = ['data' => $menus, 'permissions' => $permissions];
        Cache::put($cacheKey, $payload, 3600);
        return response()->json($payload);
    }
}
