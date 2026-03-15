<?php

namespace App\Services;

use App\Models\Menu;
use App\Models\User;
use App\Models\UserMenuPermission;
use Illuminate\Support\Collection;

class MenuService
{
    /**
     * Menus for the user based only on user_menu_permissions.
     */
    public function getMenusForUser(User $user): array
    {
        $menuIds = $this->getViewableMenuIdsForUser($user);
        if ($menuIds === []) {
            return [];
        }

        $allAllowedIds = $this->includeAncestors($menuIds);
        $menus = Menu::active()
            ->select(['id', 'menu_name', 'menu_key', 'route_path', 'icon', 'parent_id', 'sort_order'])
            ->whereIn('id', $allAllowedIds)
            ->orderBy('sort_order')
            ->get();

        return $this->buildTree($menus, null);
    }

    /**
     * Get flat permissions map: menu_key => [ view => bool, edit => bool ].
     */
    public function getPermissionsForUser(User $user): array
    {
        $rows = UserMenuPermission::where('user_id', $user->id)
            ->join('menus', 'menus.id', '=', 'user_menu_permissions.menu_id')
            ->select(
                'menus.menu_key',
                'user_menu_permissions.view_permission',
                'user_menu_permissions.edit_permission'
            )
            ->get();

        $permissions = [];
        foreach ($rows as $row) {
            $permissions[$row->menu_key] = [
                'view' => (bool) $row->view_permission,
                'edit' => (bool) $row->edit_permission,
            ];
        }
        return $permissions;
    }

    private function getViewableMenuIdsForUser(User $user): array
    {
        return UserMenuPermission::where('user_id', $user->id)
            ->where('view_permission', true)
            ->pluck('menu_id')
            ->unique()
            ->values()
            ->all();
    }

    private function includeAncestors(array $menuIds): array
    {
        $ids = $menuIds;
        $menus = Menu::whereIn('id', $ids)->select(['id', 'parent_id'])->get();
        while (true) {
            $parentIds = $menus->pluck('parent_id')->filter()->unique()->diff(collect($ids))->values()->toArray();
            if (empty($parentIds)) {
                break;
            }
            $ids = array_merge($ids, $parentIds);
            $menus = Menu::whereIn('id', $parentIds)->select(['id', 'parent_id'])->get();
        }
        return array_values(array_unique($ids));
    }

    public function buildTree(Collection $menus, ?int $parentId): array
    {
        $result = [];
        foreach ($menus->where('parent_id', $parentId) as $menu) {
            $node = [
                'id' => $menu->id,
                'menu_name' => $menu->menu_name,
                'menu_key' => $menu->menu_key,
                'route_path' => $menu->route_path,
                'icon' => $menu->icon,
            ];
            $children = $this->buildTree($menus, $menu->id);
            if (!empty($children)) {
                $node['children'] = $children;
            }
            $result[] = $node;
        }
        return $result;
    }

    public function getAllMenusTree(): array
    {
        $menus = Menu::select(['id', 'menu_name', 'menu_key', 'route_path', 'icon', 'parent_id', 'sort_order'])
            ->orderBy('sort_order')
            ->get();
        return $this->buildTree($menus, null);
    }
}
