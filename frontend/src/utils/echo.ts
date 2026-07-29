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
