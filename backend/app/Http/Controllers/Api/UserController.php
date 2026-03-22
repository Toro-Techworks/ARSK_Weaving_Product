<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    private function canAccessAdminPanel(Request $request): bool
    {
        return $request->user()->hasAnyRole(['super_admin', 'admin']);
    }

    private function canCreateRole(Request $request, int $roleId): bool
    {
        $u = $request->user();
        $roleName = Role::find($roleId)?->role_name;
        if ($u->isSuperAdmin()) {
            return in_array($roleName, ['super_admin', 'admin', 'user']);
        }
        if ($u->isAdmin()) {
            return $roleName === 'user';
        }
        return false;
    }

    private function canModifyUser(Request $request, User $target): bool
    {
        $u = $request->user();
        if ($u->isSuperAdmin()) {
            return true;
        }
        if ($u->isAdmin()) {
            return !$target->isSuperAdmin();
        }
        return false;
    }

    public function index(Request $request): JsonResponse
    {
        if (!$this->canAccessAdminPanel($request)) {
            return response()->json(['message' => 'Forbidden. Admin access required.'], 403);
        }

        $perPage = $this->clampPerPage($request, 10, 100);
        $query = User::query();

        if ($request->user()->isAdmin()) {
            $superAdminRoleId = Role::where('role_name', 'super_admin')->value('id');
            $query->where('role_id', '!=', $superAdminRoleId);
        }

        $query->when($request->search, fn ($q) => $q->where(function ($q2) use ($request) {
            $q2->where('name', 'like', "%{$request->search}%")
                ->orWhere('username', 'like', "%{$request->search}%");
        }))
            ->orderBy('name');

        $users = $query->paginate($perPage);

        return $this->paginatedResponse(
            $users,
            UserResource::collection($users->items())->resolve()
        );
    }

    public function store(Request $request): JsonResponse
    {
        if (!$this->canAccessAdminPanel($request)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'username' => 'required|string|min:4|max:255|unique:users,username|regex:/^\S+$/',
            'password' => ['required', 'confirmed', Password::defaults()],
            'role_id' => 'required|exists:roles,id',
            'status' => 'sometimes|in:active,disabled',
        ]);

        if (!$this->canCreateRole($request, (int) $validated['role_id'])) {
            return response()->json(['message' => 'You are not allowed to create this role.'], 403);
        }

        $validated['password'] = Hash::make($validated['password']);
        $validated['status'] = $validated['status'] ?? User::STATUS_ACTIVE;
        $user = User::create($validated);

        return response()->json(['data' => new UserResource($user)], 201);
    }

    public function show(Request $request, User $user): JsonResponse
    {
        if (!$this->canAccessAdminPanel($request) || !$this->canModifyUser($request, $user)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }
        return response()->json(['data' => new UserResource($user)]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        if (!$this->canAccessAdminPanel($request) || !$this->canModifyUser($request, $user)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'username' => 'sometimes|required|string|min:4|max:255|unique:users,username,' . $user->id . '|regex:/^\S+$/',
            'password' => ['nullable', 'confirmed', Password::defaults()],
            'role_id' => 'sometimes|required|exists:roles,id',
            'status' => 'sometimes|in:active,disabled',
        ]);

        if (isset($validated['role_id']) && !$this->canCreateRole($request, (int) $validated['role_id'])) {
            return response()->json(['message' => 'You cannot assign this role.'], 403);
        }

        if ($request->user()->isAdmin() && isset($validated['role_id'])) {
            $newRoleName = Role::find($validated['role_id'])?->role_name;
            if ($newRoleName !== 'user') {
                return response()->json(['message' => 'Admin can only assign User role.'], 403);
            }
        }

        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        return response()->json(['data' => new UserResource($user->fresh())]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Cannot delete your own account.'], 422);
        }
        if (!$this->canAccessAdminPanel($request) || !$this->canModifyUser($request, $user)) {
            return response()->json(['message' => 'Forbidden. Cannot delete this user.'], 403);
        }
        $user->delete();
        return response()->json(['message' => 'User deleted successfully']);
    }

    public function resetPassword(Request $request, User $user): JsonResponse
    {
        if (!$this->canAccessAdminPanel($request) || !$this->canModifyUser($request, $user)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $validated = $request->validate([
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $user->update(['password' => Hash::make($validated['password'])]);

        return response()->json(['message' => 'Password reset successfully.', 'data' => new UserResource($user->fresh())]);
    }
}
