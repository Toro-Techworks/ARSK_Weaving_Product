<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use Illuminate\Http\JsonResponse;

class RoleController extends Controller
{
    public function index(): JsonResponse
    {
        $roles = Role::orderBy('id')->get(['id', 'role_name', 'permissions']);
        return response()->json(['data' => $roles]);
    }
}
