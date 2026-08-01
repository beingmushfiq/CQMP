<?php

namespace App\Helpers;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class NodeBroadcaster
{
    /**
     * Broadcasts event payload to the cPanel Node.js WebSocket server.
     */
    public static function broadcast(string $event, mixed $payload): void
    {
        $wsUrl = config('services.node_ws_url', env('NODE_WS_URL', 'https://ws.ferozamedicinecorner.com'));

        try {
            Http::timeout(3)->post(rtrim($wsUrl, '/') . '/broadcast', [
                'event'   => $event,
                'payload' => $payload,
            ]);
        } catch (\Throwable $e) {
            Log::warning('Node WebSocket broadcast failed: ' . $e->getMessage());
        }
    }
}
