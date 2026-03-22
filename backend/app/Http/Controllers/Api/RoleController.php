<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $this->clampPerPage($request, 10, 100);
        $roles = Role::query()
            ->orderBy('id')
            ->paginate($perPage, ['id', 'role_name', 'permissions']);

        return $this->paginatedResponse($roles, $roles->items());
    }
}
