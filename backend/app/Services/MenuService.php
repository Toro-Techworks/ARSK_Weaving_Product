<?php

namespace App\Services;

use App\Models\Menu;
use App\Models\RoleMenuPermission;
use App\Models\User;
use Illuminate\Support\Collection;

class MenuService
{
    public function getMenusForUser(User $user): array
    {
        if (!$user->role_id) {
            return [];
        }

        $menuIds = RoleMenuPermission::where('role_id', $user->role_id)
            ->where('can_view', true)
            ->pluck('menu_id')
            ->unique();

        $allAllowedIds = $this->includeAncestors($menuIds->toArray());
        $menus = Menu::active()
            ->whereIn('id', $allAllowedIds)
            ->orderBy('sort_order')
            ->get();

        return $this->buildTree($menus, null);
    }

    /**
     * Get flat permissions map for the user's role: menu_key => [ view => bool, edit => bool ].
     * Used for page guards and edit control in the frontend.
     */
    public function getPermissionsForUser(User $user): array
    {
        if (!$user->role_id) {
            return [];
        }

        $rows = RoleMenuPermission::where('role_id', $user->role_id)
            ->join('menus', 'menus.id', '=', 'role_menu_permissions.menu_id')
            ->select(
                'menus.menu_key',
                'role_menu_permissions.can_view as view_permission',
                'role_menu_permissions.can_edit as edit_permission'
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

    private function includeAncestors(array $menuIds): array
    {
        $ids = $menuIds;
        $menus = Menu::whereIn('id', $ids)->get();
        while (true) {
            $parentIds = $menus->pluck('parent_id')->filter()->unique()->diff(collect($ids))->values()->toArray();
            if (empty($parentIds)) {
                break;
            }
            $ids = array_merge($ids, $parentIds);
            $menus = Menu::whereIn('id', $parentIds)->get();
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
        $menus = Menu::orderBy('sort_order')->get();
        return $this->buildTree($menus, null);
    }
}
