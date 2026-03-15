<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Menu;
use App\Models\Role;
use App\Models\RoleMenuPermission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoleMenuPermissionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $roleId = $request->query('role_id');
        if ($roleId) {
            $permissions = RoleMenuPermission::where('role_id', $roleId)
                ->with('menu')
                ->get();
            return response()->json(['data' => $permissions]);
        }

        $roles = Role::with(['menuPermissions.menu'])->get();
        $data = $roles->map(fn (Role $role) => [
            'role_id' => $role->id,
            'role_name' => $role->role_name,
            'permissions' => $role->menuPermissions->map(fn ($p) => [
                'menu_id' => $p->menu_id,
                'menu_key' => $p->menu?->menu_key,
                'menu_name' => $p->menu?->menu_name,
                'can_view' => $p->can_view,
                'can_create' => $p->can_create,
                'can_edit' => $p->can_edit,
                'can_delete' => $p->can_delete,
            ]),
        ]);
        return response()->json(['data' => $data]);
    }

    public function assign(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'role_id' => 'required|exists:roles,id',
            'menu_id' => 'required|exists:menus,id',
            'can_view' => 'boolean',
            'can_create' => 'boolean',
            'can_edit' => 'boolean',
            'can_delete' => 'boolean',
        ]);

        $validated['can_view'] = $validated['can_view'] ?? true;
        $validated['can_create'] = $validated['can_create'] ?? false;
        $validated['can_edit'] = $validated['can_edit'] ?? false;
        $validated['can_delete'] = $validated['can_delete'] ?? false;

        $perm = RoleMenuPermission::updateOrCreate(
            [
                'role_id' => $validated['role_id'],
                'menu_id' => $validated['menu_id'],
            ],
            $validated
        );
        return response()->json(['data' => $perm->load('menu')]);
    }

    public function assignBulk(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'role_id' => 'required|exists:roles,id',
            'permissions' => 'required|array',
            'permissions.*.menu_id' => 'required|exists:menus,id',
            'permissions.*.can_view' => 'boolean',
            'permissions.*.can_create' => 'boolean',
            'permissions.*.can_edit' => 'boolean',
            'permissions.*.can_delete' => 'boolean',
        ]);

        $roleId = $validated['role_id'];
        $submittedMenuIds = collect($validated['permissions'])->pluck('menu_id')->unique()->values()->all();

        // Remove permissions for menus not in the submitted list so Assign Menu changes are fully applied
        RoleMenuPermission::where('role_id', $roleId)
            ->whereNotIn('menu_id', $submittedMenuIds)
            ->delete();

        foreach ($validated['permissions'] as $p) {
            RoleMenuPermission::updateOrCreate(
                [
                    'role_id' => $roleId,
                    'menu_id' => $p['menu_id'],
                ],
                [
                    'can_view' => $p['can_view'] ?? true,
                    'can_create' => $p['can_create'] ?? false,
                    'can_edit' => $p['can_edit'] ?? false,
                    'can_delete' => $p['can_delete'] ?? false,
                ]
            );
        }

        $permissions = RoleMenuPermission::where('role_id', $roleId)->with('menu')->get();
        return response()->json(['data' => $permissions]);
    }
}
