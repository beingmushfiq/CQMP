import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Extend window interface for global Pusher assignment
declare global {
  interface Window {
    Pusher: typeof Pusher;
    Echo: Echo;
  }
}

window.Pusher = Pusher;

// Only log Pusher connection events in development.
// In production this would fill the browser console with noise.
Pusher.logToConsole = import.meta.env.DEV;

<<<<<<< HEAD
/**
 * Production-ready Laravel Echo instance.
 *
 * Changes from dev version:
 *  - All config values driven by VITE_REVERB_* env vars (no localhost fallbacks)
 *  - enabledTransports includes 'wss' — required for HTTPS production connections
 *    (dev used ['ws'] only which fails on any HTTPS page due to mixed-content)
 *  - forceTLS derived correctly from VITE_REVERB_SCHEME=https
 *  - wssPort set to VITE_REVERB_PORT (443 in production via Apache proxy)
 *
 * Production connection: wss://api.ferozamedicinecorner.com (port 443)
 * Development connection: ws://127.0.0.1:8080
 */
export const echo = new Echo({
  broadcaster: 'reverb',

  // REQUIRED: must match REVERB_APP_KEY in backend .env
  key: import.meta.env.VITE_REVERB_APP_KEY,

  // WebSocket host — api.ferozamedicinecorner.com in production
  wsHost: import.meta.env.VITE_REVERB_HOST,

  // ws:// port (development)
  wsPort: parseInt(import.meta.env.VITE_REVERB_PORT ?? '8080', 10),

  // wss:// port — 443 in production (same port as HTTPS, via Apache proxy)
  wssPort: parseInt(import.meta.env.VITE_REVERB_PORT ?? '443', 10),

  // forceTLS=true when scheme=https — enables wss:// (encrypted WebSocket)
  // forceTLS=false for local http:// development (ws://)
  forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https',

  // Include BOTH ws and wss so the client can use whichever the server supports.
  // dev-only 'ws' caused silent failures on any HTTPS-served page because
  // browsers block unencrypted WebSocket connections from HTTPS origins.
  enabledTransports: ['ws', 'wss'],

  // Do not report statistics to Pusher/Reverb analytics endpoint
  disableStats: true,
});
=======
const broadcastDriver = (import.meta.env.VITE_BROADCAST_DRIVER ?? 'reverb').trim().toLowerCase();
const hasPusherConfig = Boolean(import.meta.env.VITE_PUSHER_APP_KEY?.trim());

let echoInstance: any;

if (broadcastDriver === 'pusher' || (hasPusherConfig && broadcastDriver !== 'reverb')) {
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
  const reverbScheme = (import.meta.env.VITE_REVERB_SCHEME ?? 'http').trim().toLowerCase();
  const reverbPort = parseInt(import.meta.env.VITE_REVERB_PORT ?? (reverbScheme === 'https' ? '443' : '8080'), 10);
  const isSecure = reverbScheme === 'https';

  echoInstance = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY ?? 'cqmp-reverb-key',
    wsHost: import.meta.env.VITE_REVERB_HOST ?? '127.0.0.1',
    wsPort: reverbPort,
    wssPort: reverbPort,
    forceTLS: isSecure,
    encrypted: isSecure,
    enabledTransports: ['ws', 'wss'],
    disableStats: true,
  });
}

export const echo = echoInstance;
>>>>>>> a5d6782e8d855b466f5d697f5d32fe904a695e12
