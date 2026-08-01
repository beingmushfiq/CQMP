<?php

namespace App\Services;

use App\Models\User;
use Exception;
use Illuminate\Support\Facades\Log;

class JwtService
{
    /**
     * Secret key for signing tokens (uses Laravel APP_KEY).
     */
    protected static function getSecretKey(): string
    {
        return config('app.key') ?: 'base64:vZxPhY0yJQa4UDdFlM8V9faMBJpzd9SuZHj/28shrkg=';
    }

    /**
     * Encode payload array into JWT string (HS256).
     */
    public static function generateToken(User $user, int $ttlMinutes = 120): string
    {
        $header = [
            'typ' => 'JWT',
            'alg' => 'HS256'
        ];

        $issuedAt = time();
        $expireAt = $issuedAt + ($ttlMinutes * 60);

        $payload = [
            'iss' => config('app.url', 'http://localhost'),
            'sub' => $user->id,
            'email' => $user->email,
            'name' => $user->name,
            'roles' => $user->getRoleNames()->toArray(),
            'iat' => $issuedAt,
            'exp' => $expireAt,
        ];

        $base64UrlHeader = self::base64UrlEncode(json_encode($header));
        $base64UrlPayload = self::base64UrlEncode(json_encode($payload));

        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, self::getSecretKey(), true);
        $base64UrlSignature = self::base64UrlEncode($signature);

        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    /**
     * Validate and decode token. Returns payload array or null if invalid.
     */
    public static function validateToken(string $token): ?array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        [$base64UrlHeader, $base64UrlPayload, $base64UrlSignature] = $parts;

        // Verify Signature
        $expectedSignature = self::base64UrlEncode(
            hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, self::getSecretKey(), true)
        );

        if (!hash_equals($expectedSignature, $base64UrlSignature)) {
            Log::warning('JWT signature mismatch');
            return null;
        }

        $payload = json_decode(self::base64UrlDecode($base64UrlPayload), true);

        if (!$payload || !isset($payload['exp']) || !isset($payload['sub'])) {
            return null;
        }

        // Expiration check
        if (time() >= $payload['exp']) {
            Log::info('JWT token expired', ['sub' => $payload['sub']]);
            return null;
        }

        return $payload;
    }

    /**
     * Base64URL encoding helper.
     */
    public static function base64UrlEncode(string $data): string
    {
        return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
    }

    /**
     * Base64URL decoding helper.
     */
    public static function base64UrlDecode(string $data): string
    {
        $remainder = strlen($data) % 4;
        if ($remainder) {
            $data .= str_repeat('=', 4 - $remainder);
        }
        return base64_decode(str_replace(['-', '_'], ['+', '/'], $data));
    }
}
