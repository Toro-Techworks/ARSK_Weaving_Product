<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Role;
use App\Models\User;
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
            // Stateless login: do not use Auth::attempt() on API routes — it writes to the session
            // guard and requires StartSession + writable session storage. That commonly causes 500s in
            // production when only Bearer tokens are used.
            $user = User::query()
                ->where('username', $request->string('username')->trim()->toString())
                ->first();

            if (! $user || ! Hash::check($request->password, $user->password)) {
                throw ValidationException::withMessages([
                    'username' => ['The provided credentials are incorrect.'],
                ]);
            }

            if (! $user->isActive()) {
                throw ValidationException::withMessages([
                    'username' => ['This account has been disabled. Contact an administrator.'],
                ]);
            }

            $user->tokens()->delete();
            $token = $user->createToken('auth-token')->plainTextToken;
            $user->load('role');

            return response()->json([
                'user' => new UserResource($user),
                'token' => $token,
                'token_type' => 'Bearer',
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
        $request->user()->load('role');

        return response()->json(['user' => new UserResource($request->user())]);
    }
}
