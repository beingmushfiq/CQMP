<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\JwtService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class JwtMiddleware
{
    /**
     * Handle an incoming request and authenticate user via JWT Bearer token.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if (! $token) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $payload = JwtService::validateToken($token);

        if (! $payload) {
            return response()->json(['message' => 'Invalid or expired token.'], 401);
        }

        $user = User::find($payload['sub']);

        if (! $user) {
            return response()->json(['message' => 'User not found.'], 401);
        }

        // Authenticate user into current request instance
        Auth::setUser($user);

        return $next($request);
    }
}
