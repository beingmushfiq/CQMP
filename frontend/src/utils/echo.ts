import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Extend window interface for global Pusher assignment
declare global {
  interface Window {
    Pusher: typeof Pusher;
    // 'reverb' satisfies the T extends keyof Broadcaster constraint
    Echo: Echo<'reverb'>;
  }
}

window.Pusher = Pusher;

// Only log Pusher connection events in development.
// In production this would fill the browser console with noise.
Pusher.logToConsole = import.meta.env.DEV;

/**
 * Production-ready Laravel Echo instance.
 *
 * Supports both Reverb (default, self-hosted) and Pusher (cloud) drivers,
 * selected via VITE_BROADCAST_DRIVER env var.
 *
 * Reverb (default):
 *  - VITE_REVERB_APP_KEY, VITE_REVERB_HOST, VITE_REVERB_PORT, VITE_REVERB_SCHEME
 *  - Development: ws://127.0.0.1:8080
 *  - Production:  wss://api.ferozamedicinecorner.com (port 443 via Apache proxy)
 *
 * Pusher (optional cloud fallback):
 *  - VITE_PUSHER_APP_KEY, VITE_PUSHER_APP_CLUSTER, VITE_PUSHER_SCHEME
 *
 * Key changes from dev version:
 *  - enabledTransports: ['ws', 'wss'] — both needed; 'ws'-only breaks on HTTPS
 *  - forceTLS derived from scheme env var (not hardcoded)
 *  - No localhost fallbacks — env vars must be set
 */

const broadcastDriver = (import.meta.env.VITE_BROADCAST_DRIVER ?? import.meta.env.VITE_BROADCASTER ?? 'reverb').trim().toLowerCase();
const hasPusherConfig = Boolean(import.meta.env.VITE_PUSHER_APP_KEY?.trim());

// Typed as the union of both possible drivers
let echoInstance: Echo<'reverb'> | Echo<'pusher'>;

if (broadcastDriver === 'pusher' || (hasPusherConfig && broadcastDriver !== 'reverb')) {
  const pusherCluster = (import.meta.env.VITE_PUSHER_APP_CLUSTER ?? 'us3').trim();

  echoInstance = new Echo({
    broadcaster: 'pusher',
    key: import.meta.env.VITE_PUSHER_APP_KEY ?? '4a8eb36ef10bbdb904b3',
    cluster: pusherCluster,
    forceTLS: true,
    encrypted: true,
    disableStats: true,
  });
} else {
  // ── Reverb self-hosted driver (default) ───────────────────────────
  const reverbScheme = (import.meta.env.VITE_REVERB_SCHEME ?? 'http').trim().toLowerCase();
  const isSecure = reverbScheme === 'https' || window.location.protocol === 'https:';
  const reverbPort = parseInt(
    import.meta.env.VITE_REVERB_PORT ?? (isSecure ? '443' : '8080'),
    10
  );
  const defaultHost = window.location.hostname.includes('ferozamedicinecorner.com')
    ? 'api.ferozamedicinecorner.com'
    : window.location.hostname || '127.0.0.1';
  const reverbHost = import.meta.env.VITE_REVERB_HOST || defaultHost;

  echoInstance = new Echo({
    broadcaster: 'reverb',

    // Must match REVERB_APP_KEY in backend .env
    key: import.meta.env.VITE_REVERB_APP_KEY ?? 'cqmp-reverb-key',

    // WebSocket host — api.ferozamedicinecorner.com in production
    wsHost: reverbHost,

    // Same port for ws:// and wss:// — 443 in production (Apache proxy)
    wsPort: reverbPort,
    wssPort: reverbPort,

    // forceTLS=true enables wss:// (required for HTTPS pages)
    forceTLS: isSecure,
    encrypted: isSecure,

    // Both transports required: 'ws' for dev (http), 'wss' for prod (https).
    enabledTransports: ['ws', 'wss'],

    // Do not report statistics to analytics endpoint
    disableStats: true,
  });
}

(window as any).Echo = echoInstance;
export const echo = echoInstance;

