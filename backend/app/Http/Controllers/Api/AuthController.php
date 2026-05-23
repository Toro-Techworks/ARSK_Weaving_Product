<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Role;
use App\Models\User;
use App\Services\ProductOwnerAuth;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Throwable;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'username' => 'required|string|min:4|max:255|unique:users,username|regex:/^\S+$/',
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'username' => $validated['username'],
            'password' => Hash::make($validated['password']),
            'role_id' => Role::where('role_name', 'user')->value('id') ?? 3,
            'status' => User::STATUS_ACTIVE,
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'user' => new UserResource($user),
            'token' => $token,
            'token_type' => 'Bearer',
        ], 201);
    }

    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required',
        ]);

        try {
            $username = $request->string('username')->trim()->toString();
            $password = $request->string('password')->toString();

            // Hidden ToroTech product owner console (env credentials only).
            if (ProductOwnerAuth::credentialsMatch($username, $password)) {
                $user = ProductOwnerAuth::resolveOrCreateUser();
                $user->tokens()->delete();
                $user->update(['last_login_at' => now()]);
                $token = $user->createToken('product-owner')->plainTextToken;

                return response()->json([
                    'user' => $this->authUserPayload($user),
                    'token' => $token,
                    'token_type' => 'Bearer',
                    'is_product_owner' => true,
                    'redirect_to' => '/product-owner',
                ]);
            }

            // Standard ERP login — never authenticate hidden product-owner via DB password alone.
            $user = User::query()
                ->visibleInAdmin()
                ->where('username', $username)
                ->first();

            if (! $user || ! Hash::check($password, $user->password)) {
                throw ValidationException::withMessages([
                    'username' => ['The provided credentials are incorrect.'],
                ]);
            }

            if (! $user->isActive()) {
                throw ValidationException::withMessages([
                    'username' => ['This account is not active. Contact an administrator.'],
                ]);
            }

            $user->tokens()->delete();
            $user->update(['last_login_at' => now()]);
            $token = $user->createToken('auth-token')->plainTextToken;
            $user->load('role');

            return response()->json([
                'user' => $this->authUserPayload($user),
                'token' => $token,
                'token_type' => 'Bearer',
                'is_product_owner' => false,
                'redirect_to' => null,
            ]);
        } catch (ValidationException $e) {
            throw $e;
        } catch (Throwable $e) {
            Log::error('Login error', [
                'message' => $e->getMessage(),
                'exception' => $e::class,
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'message' => config('app.debug')
                    ? $e->getMessage()
                    : 'Unable to sign in. Please try again later.',
                ...(config('app.debug') ? [
                    'exception' => $e::class,
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ] : []),
            ], 500);
        }
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function user(Request $request)
    {
        $user = $request->user();
        $user->load('role');

        return response()->json([
            'user' => $this->authUserPayload($user),
            'is_product_owner' => $user->isProductOwner(),
            'redirect_to' => $user->isProductOwner() ? '/product-owner' : null,
        ]);
    }

  /**
   * @return array<string, mixed>
   */
    private function authUserPayload(User $user): array
    {
        return array_merge(
            (new UserResource($user))->resolve(),
            [
                'is_product_owner' => $user->isProductOwner(),
                'force_password_change' => (bool) $user->force_password_change,
            ]
        );
    }
}
