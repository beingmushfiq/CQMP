<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * POST /api/v1/login
     * Issue a Sanctum API token.
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $token = $user->createToken('cqmp-token', $user->getRoleNames()->toArray())->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => new UserResource($user),
        ]);
    }

    /**
     * POST /api/v1/logout
     * Revoke only the current token — preserves other active sessions
     * (e.g., receptionist logged in on multiple devices).
     */
    public function logout(Request $request): JsonResponse
    {
        // Delete only the token used in this request.
        // Avoids logging out the same user from all devices simultaneously.
        $request->user()?->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }

    /**
     * GET /api/v1/me
     * Return the authenticated user.
     */
    public function me(Request $request): UserResource
    {
        return new UserResource($request->user());
    }
}
