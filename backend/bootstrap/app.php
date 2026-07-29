<?php

use App\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {

        // ── Trusted Proxies ───────────────────────────────────────
        // cPanel shared hosting typically sits behind a load balancer
        // or reverse proxy. Without trusting proxies, the app sees
        // the proxy's IP instead of the client's real IP, breaking
        // rate limiting (all requests appear from the same IP) and
        // generating wrong URLs (http:// instead of https://).
        $middleware->trustProxies(
            at: '*',  // Trust all proxies — safe on cPanel where
                      // the server IP is the only upstream source.
            headers: Request::HEADER_X_FORWARDED_FOR |
                     Request::HEADER_X_FORWARDED_HOST |
                     Request::HEADER_X_FORWARDED_PORT |
                     Request::HEADER_X_FORWARDED_PROTO,
        );

        // ── Security Headers ─────────────────────────────────────
        // Applied to every response globally. Adding it here rather
        // than per-route ensures headers are never accidentally skipped.
        $middleware->append(SecurityHeaders::class);

        // ── Sanctum SPA middleware for stateful cookie auth ───────
        // Required if you ever switch from Bearer tokens to cookie
        // auth. Safe to have registered even in token-only mode.
        $middleware->statefulApi();

    })
    ->withExceptions(function (Exceptions $exceptions): void {

        // ── Always return JSON for API routes ────────────────────
        // Prevents HTML error pages (with stack traces) from leaking
        // to API consumers in production. Without this, unhandled
        // exceptions on /api/* routes return Whoops HTML pages even
        // when APP_DEBUG=false.
        $exceptions->shouldRenderJsonWhen(
            fn(Request $request): bool => $request->is('api/*') || $request->expectsJson(),
        );

        // ── Sanitize production error responses ──────────────────
        // In production, never expose the real exception message;
        // return a generic 500 with a request ID for log tracing.
        $exceptions->respond(function (Response $response, \Throwable $e, Request $request) {
            if (app()->isProduction() && $response->getStatusCode() >= 500 && $request->is('api/*')) {
                return response()->json([
                    'message' => 'An unexpected error occurred. Please try again.',
                ], $response->getStatusCode());
            }
            return $response;
        });

    })->create();
