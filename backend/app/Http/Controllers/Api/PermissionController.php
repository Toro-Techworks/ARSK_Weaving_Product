<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Menu;
use App\Models\User;
use App\Models\UserMenuPermission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class PermissionController extends Controller
{
    /**
     * GET /permissions/users — paginated (use per_page=500 for full matrix load).
     */
    public function users(Request $request): JsonResponse
    {
        $perPage = (int) $request->input('per_page', 10);
        $perPage = $perPage >= 1 && $perPage <= 500 ? $perPage : 10;

        $users = User::active()
            ->select(['id', 'name', 'username', 'role_id', 'status', 'created_at'])
            ->with('role:id,role_name')
            ->orderBy('name')
            ->paginate($perPage);

        return $this->paginatedResponse(
            $users,
            UserResource::collection($users->items())->resolve()
        );
    }

    /**
     * GET /permissions/menus - all menus flat (for matrix columns).
     */
    public function menus(): JsonResponse
    {
        $menus = Menu::active()->orderBy('sort_order')->get(['id', 'menu_name', 'menu_key', 'parent_id', 'sort_order']);
        return response()->json(['data' => $menus]);
    }

    /**
     * GET /permissions/user-menu - user-menu permission mapping.
     */
    public function userMenu(): JsonResponse
    {
        $rows = UserMenuPermission::query()
            ->select(['user_id', 'menu_id', 'view_permission', 'edit_permission'])
            ->get();
        $data = $rows->map(fn ($r) => [
            'user_id' => $r->user_id,
            'menu_id' => $r->menu_id,
            'view' => (bool) $r->view_permission,
            'edit' => (bool) $r->edit_permission,
        ])->values()->all();
        return response()->json(['data' => $data]);
    }

    /**
     * POST /permissions/save - save full permission matrix.
     */
    public function save(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'permissions' => 'required|array',
            'permissions.*.user_id' => 'required|integer|exists:users,id',
            'permissions.*.menu_id' => 'required|integer|exists:menus,id',
            'permissions.*.view' => 'required|boolean',
            'permissions.*.edit' => 'required|boolean',
        ]);

        UserMenuPermission::query()->delete();

        $inserts = [];
        foreach ($validated['permissions'] as $p) {
            if (!$p['view'] && !$p['edit']) {
                continue;
            }
            $inserts[] = [
                'user_id' => (int) $p['user_id'],
                'menu_id' => (int) $p['menu_id'],
                'view_permission' => $p['view'] || $p['edit'],
                'edit_permission' => $p['edit'],
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        if (!empty($inserts)) {
            foreach (array_chunk($inserts, 500) as $chunk) {
                UserMenuPermission::insert($chunk);
            }
        }

        $this->clearMenuCacheForAllUsers();

        return response()->json(['message' => 'Permissions saved.', 'count' => count($inserts)]);
    }

    private function clearMenuCacheForAllUsers(): void
    {
        $userIds = User::query()->pluck('id');
        foreach ($userIds as $id) {
            Cache::forget('user_menus_' . $id);
        }
    }
}
