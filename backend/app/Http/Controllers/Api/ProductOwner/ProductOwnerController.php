<?php

namespace App\Http\Controllers\Api\ProductOwner;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductOwnerUserResource;
use App\Models\ProductOwnerAuditLog;
use App\Models\Role;
use App\Models\User;
use App\Services\ProductOwnerAuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Laravel\Sanctum\PersonalAccessToken;

class ProductOwnerController extends Controller
{
    private function assertTargetIsManageable(User $target): void
    {
        if ($target->isProductOwner()) {
            abort(422, 'The product owner account cannot be modified from this console.');
        }
    }

    public function dashboard(Request $request): JsonResponse
    {
        $visible = User::query()->visibleInAdmin();

        return response()->json([
            'data' => [
                'total_users' => (clone $visible)->count(),
                'active_users' => (clone $visible)->where('status', User::STATUS_ACTIVE)->count(),
                'inactive_users' => (clone $visible)->where('status', User::STATUS_INACTIVE)->count(),
                'left_users' => (clone $visible)->where('status', User::STATUS_LEFT)->count(),
                'force_password_change' => (clone $visible)->where('force_password_change', true)->count(),
                'active_sessions' => PersonalAccessToken::query()
                    ->where('tokenable_type', User::class)
                    ->where(function ($q) {
                        $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
                    })
                    ->count(),
                'recent_audit' => ProductOwnerAuditLog::query()
                    ->with(['actor:id,name,username', 'target:id,name,username'])
                    ->orderByDesc('created_at')
                    ->limit(8)
                    ->get()
                    ->map(fn ($row) => $this->formatAuditRow($row)),
            ],
        ]);
    }

    public function usersIndex(Request $request): JsonResponse
    {
        $perPage = $this->clampPerPage($request, 10, 100);
        $query = User::query()
            ->visibleInAdmin()
            ->with('role:id,role_name')
            ->when($request->search, fn ($q) => $q->where(function ($q2) use ($request) {
                $q2->where('name', 'like', "%{$request->search}%")
                    ->orWhere('username', 'like', "%{$request->search}%")
                    ->orWhere('designation', 'like', "%{$request->search}%");
            }))
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->role, fn ($q) => $q->whereHas('role', fn ($r) => $r->where('role_name', $request->role)))
            ->orderBy('name');

        $paginator = $query->paginate($perPage);

        return $this->paginatedResponse(
            $paginator,
            ProductOwnerUserResource::collection($paginator->items())->resolve()
        );
    }

    public function usersStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'username' => 'required|string|min:4|max:255|unique:users,username|regex:/^\S+$/',
            'designation' => 'nullable|string|max:255',
            'password' => ['required', 'confirmed', Password::defaults()],
            'role_id' => 'required|exists:roles,id',
            'status' => 'sometimes|in:active,inactive,left',
            'force_password_change' => 'sometimes|boolean',
        ]);

        $username = strtolower(trim($validated['username']));
        if ($username === strtolower(trim((string) config('product_owner.username', 'torotech')))) {
            return response()->json(['message' => 'This username is reserved.'], 422);
        }

        $user = User::create([
            'name' => $validated['name'],
            'username' => $validated['username'],
            'designation' => $validated['designation'] ?? null,
            'password' => Hash::make($validated['password']),
            'role_id' => $validated['role_id'],
            'status' => $validated['status'] ?? User::STATUS_ACTIVE,
            'force_password_change' => (bool) ($validated['force_password_change'] ?? false),
            'is_product_owner' => false,
            'is_hidden' => false,
        ]);

        ProductOwnerAuditLogger::log(
            $request->user(),
            'user_created',
            $user,
            "Created user {$user->username}",
            $request,
            ['role_id' => $user->role_id]
        );

        return response()->json(['data' => new ProductOwnerUserResource($user->load('role'))], 201);
    }

    public function usersUpdate(Request $request, User $user): JsonResponse
    {
        $this->assertTargetIsManageable($user);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'username' => 'sometimes|required|string|min:4|max:255|unique:users,username,'.$user->id.'|regex:/^\S+$/',
            'designation' => 'nullable|string|max:255',
            'role_id' => 'sometimes|required|exists:roles,id',
            'status' => 'sometimes|in:active,inactive,left',
            'force_password_change' => 'sometimes|boolean',
        ]);

        if (isset($validated['username'])) {
            $uname = strtolower(trim($validated['username']));
            if ($uname === strtolower(trim((string) config('product_owner.username', 'torotech')))) {
                return response()->json(['message' => 'This username is reserved.'], 422);
            }
        }

        $previousRole = $user->role_id;
        $previousStatus = $user->status;

        $user->update($validated);

        if (isset($validated['role_id']) && (int) $validated['role_id'] !== (int) $previousRole) {
            ProductOwnerAuditLogger::log(
                $request->user(),
                'role_changed',
                $user->fresh(),
                "Role changed for {$user->username}",
                $request,
                ['from_role_id' => $previousRole, 'to_role_id' => $validated['role_id']]
            );
        }

        if (isset($validated['status']) && $validated['status'] !== $previousStatus) {
            $action = $validated['status'] === User::STATUS_ACTIVE ? 'account_enabled' : 'account_disabled';
            ProductOwnerAuditLogger::log(
                $request->user(),
                $action,
                $user->fresh(),
                "Status set to {$validated['status']} for {$user->username}",
                $request
            );
        } else {
            ProductOwnerAuditLogger::log(
                $request->user(),
                'user_updated',
                $user->fresh(),
                "Updated user {$user->username}",
                $request
            );
        }

        return response()->json(['data' => new ProductOwnerUserResource($user->fresh()->load('role'))]);
    }

    public function resetPassword(Request $request, User $user): JsonResponse
    {
        $this->assertTargetIsManageable($user);

        $validated = $request->validate([
            'password' => ['required', 'confirmed', Password::defaults()],
            'force_password_change' => 'sometimes|boolean',
        ]);

        $user->update([
            'password' => Hash::make($validated['password']),
            'force_password_change' => (bool) ($validated['force_password_change'] ?? false),
        ]);

        $user->tokens()->delete();

        ProductOwnerAuditLogger::log(
            $request->user(),
            'password_reset',
            $user,
            "Password reset for {$user->username}",
            $request
        );

        return response()->json(['message' => 'Password reset successfully.']);
    }

    public function generateTemporaryPassword(Request $request, User $user): JsonResponse
    {
        $this->assertTargetIsManageable($user);

        $temp = Str::password(14);

        $user->update([
            'password' => Hash::make($temp),
            'force_password_change' => true,
        ]);
        $user->tokens()->delete();

        ProductOwnerAuditLogger::log(
            $request->user(),
            'temporary_password_generated',
            $user,
            "Temporary password generated for {$user->username}",
            $request
        );

        return response()->json([
            'message' => 'Temporary password generated. Share it securely; it is shown only once.',
            'temporary_password' => $temp,
        ]);
    }

    public function forcePasswordChange(Request $request, User $user): JsonResponse
    {
        $this->assertTargetIsManageable($user);

        $user->update(['force_password_change' => true]);
        $user->tokens()->delete();

        ProductOwnerAuditLogger::log(
            $request->user(),
            'force_password_change',
            $user,
            "Force password change enabled for {$user->username}",
            $request
        );

        return response()->json(['message' => 'User must change password on next login.']);
    }

    public function revokeSessions(Request $request, User $user): JsonResponse
    {
        $this->assertTargetIsManageable($user);

        $count = $user->tokens()->count();
        $user->tokens()->delete();

        ProductOwnerAuditLogger::log(
            $request->user(),
            'sessions_revoked',
            $user,
            "Revoked {$count} session(s) for {$user->username}",
            $request
        );

        return response()->json(['message' => 'All sessions revoked.', 'revoked' => $count]);
    }

    public function roles(): JsonResponse
    {
        $roles = Role::query()->orderBy('role_name')->get(['id', 'role_name']);

        return response()->json([
            'data' => $roles->map(fn ($r) => [
                'id' => $r->id,
                'role_name' => $r->role_name,
                'label' => ucwords(str_replace('_', ' ', $r->role_name)),
            ]),
        ]);
    }

    public function securityOverview(Request $request): JsonResponse
    {
        $tokens = PersonalAccessToken::query()
            ->where('tokenable_type', User::class)
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->orderByDesc('last_used_at')
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        $userIds = $tokens->pluck('tokenable_id')->unique()->filter()->values();
        $users = User::query()->visibleInAdmin()->whereIn('id', $userIds)->get()->keyBy('id');

        $sessions = $tokens->map(function (PersonalAccessToken $token) use ($users) {
            $u = $users->get($token->tokenable_id);

            return [
                'token_id' => $token->id,
                'user_id' => $token->tokenable_id,
                'username' => $u?->username,
                'name' => $u?->name,
                'token_name' => $token->name,
                'last_used_at' => $token->last_used_at?->toIso8601String(),
                'created_at' => $token->created_at?->toIso8601String(),
            ];
        })->filter(fn ($s) => $s['username'] !== null)->values();

        return response()->json([
            'data' => [
                'active_sessions' => $sessions,
                'active_session_count' => PersonalAccessToken::query()
                    ->where('tokenable_type', User::class)
                    ->where(function ($q) {
                        $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
                    })
                    ->count(),
                'users_with_sessions' => $sessions->pluck('user_id')->unique()->count(),
            ],
        ]);
    }

    public function auditLogs(Request $request): JsonResponse
    {
        $perPage = $this->clampPerPage($request, 15, 100);

        $query = ProductOwnerAuditLog::query()
            ->with(['actor:id,name,username', 'target:id,name,username'])
            ->orderByDesc('created_at')
            ->orderByDesc('id');

        if ($request->filled('action')) {
            $query->where('action', $request->input('action'));
        }
        if ($request->filled('search')) {
            $s = '%'.trim((string) $request->input('search')).'%';
            $query->where(function ($q) use ($s) {
                $q->where('description', 'like', $s)
                    ->orWhere('action', 'like', $s)
                    ->orWhereHas('actor', fn ($a) => $a->where('username', 'like', $s)->orWhere('name', 'like', $s))
                    ->orWhereHas('target', fn ($t) => $t->where('username', 'like', $s)->orWhere('name', 'like', $s));
            });
        }

        $paginator = $query->paginate($perPage);
        $data = collect($paginator->items())->map(fn ($row) => $this->formatAuditRow($row))->all();

        return $this->paginatedResponse($paginator, $data);
    }

    private function formatAuditRow(ProductOwnerAuditLog $row): array
    {
        return [
            'id' => $row->id,
            'action' => $row->action,
            'description' => $row->description,
            'actor_user_id' => $row->actor_user_id,
            'actor_name' => $row->actor?->name ?? $row->actor?->username,
            'target_user_id' => $row->target_user_id,
            'target_name' => $row->target?->name ?? $row->target?->username,
            'ip_address' => $row->ip_address,
            'user_agent' => $row->user_agent,
            'metadata' => $row->metadata,
            'created_at' => $row->created_at?->toIso8601String(),
        ];
    }
}
