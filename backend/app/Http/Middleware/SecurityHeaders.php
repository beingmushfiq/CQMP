<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Adds security headers to every HTTP response.
 *
 * Why: Laravel ships with no security headers by default.
 * Without these, browsers allow clickjacking, MIME sniffing,
 * and cross-origin data leakage — all OWASP Top 10 risks.
 *
 * Headers applied:
 *  - X-Content-Type-Options   → prevents MIME sniffing
 *  - X-Frame-Options          → prevents clickjacking
 *  - X-XSS-Protection         → legacy XSS filter (browsers still respect it)
 *  - Referrer-Policy          → limits referrer data leakage
 *  - Permissions-Policy       → disables unused browser APIs
 *  - Strict-Transport-Security → enforces HTTPS (HSTS)
 *  - Content-Security-Policy  → restricts resource origins (API-focused)
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('X-XSS-Protection', '1; mode=block');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

        // HSTS — tell browsers to always use HTTPS for 1 year.
        // Only enable once SSL is confirmed working; removing it
        // requires waiting out the max-age period.
        if (app()->isProduction()) {
            $response->headers->set(
                'Strict-Transport-Security',
                'max-age=31536000; includeSubDomains'
            );
        }

        // CSP for the API subdomain: no HTML is served, so we
        // restrict everything and only allow same-origin fetches.
        $frontendUrl = rtrim(config('app.frontend_url', env('FRONTEND_URL', '*')), '/');
        $response->headers->set(
            'Content-Security-Policy',
            "default-src 'none'; connect-src 'self' {$frontendUrl}; frame-ancestors 'none'"
        );

        return $response;
    }
}
