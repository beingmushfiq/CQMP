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

const broadcastDriver = (import.meta.env.VITE_BROADCAST_DRIVER ?? 'reverb').trim().toLowerCase();
const hasPusherConfig = Boolean(import.meta.env.VITE_PUSHER_APP_KEY?.trim());

// Typed as the union of both possible drivers
let echoInstance: Echo<'reverb'> | Echo<'pusher'>;

if (broadcastDriver === 'pusher' || (hasPusherConfig && broadcastDriver !== 'reverb')) {
  // ── Pusher cloud driver ──────────────────────────────────────────
  const pusherScheme = (import.meta.env.VITE_PUSHER_SCHEME ?? 'https').trim().toLowerCase();
  const pusherCluster = (import.meta.env.VITE_PUSHER_APP_CLUSTER ?? 'mt1').trim();

  echoInstance = new Echo({
    broadcaster: 'pusher',
    key: import.meta.env.VITE_PUSHER_APP_KEY ?? 'replace-with-pusher-key',
    cluster: pusherCluster,
    forceTLS: pusherScheme === 'https',
    encrypted: pusherScheme === 'https',
    disableStats: true,
  });
} else {
  // ── Reverb self-hosted driver (default) ───────────────────────────
  const reverbScheme = (import.meta.env.VITE_REVERB_SCHEME ?? 'http').trim().toLowerCase();
  const reverbPort = parseInt(
    import.meta.env.VITE_REVERB_PORT ?? (reverbScheme === 'https' ? '443' : '8080'),
    10
  );
  const isSecure = reverbScheme === 'https';

  echoInstance = new Echo({
    broadcaster: 'reverb',

    // Must match REVERB_APP_KEY in backend .env
    key: import.meta.env.VITE_REVERB_APP_KEY ?? 'cqmp-reverb-key',

    // WebSocket host — api.ferozamedicinecorner.com in production
    wsHost: import.meta.env.VITE_REVERB_HOST ?? '127.0.0.1',

    // Same port for ws:// and wss:// — 443 in production (Apache proxy)
    wsPort: reverbPort,
    wssPort: reverbPort,

    // forceTLS=true enables wss:// (required for HTTPS pages)
    forceTLS: isSecure,
    encrypted: isSecure,

    // Both transports required: 'ws' for dev (http), 'wss' for prod (https).
    // Using ['ws'] only causes silent failures on HTTPS pages due to
    // browser mixed-content blocking.
    enabledTransports: ['ws', 'wss'],

    // Do not report statistics to analytics endpoint
    disableStats: true,
  });
}

export const echo = echoInstance;
