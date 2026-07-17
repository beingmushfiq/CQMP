import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Extend window interface for global Pusher assignment
declare global {
  interface Window {
    Pusher: typeof Pusher;
    Echo: any;
  }
}

window.Pusher = Pusher;

// Suppress Pusher connection errors in console when Reverb is unreachable
Pusher.logToConsole = false;

export const echo = new Echo({
  broadcaster: 'reverb',
  key: import.meta.env.VITE_REVERB_APP_KEY ?? 'cqmp-reverb-key',
  wsHost: import.meta.env.VITE_REVERB_HOST ?? '127.0.0.1',
  wsPort: parseInt(import.meta.env.VITE_REVERB_PORT ?? '8080'),
  wssPort: parseInt(import.meta.env.VITE_REVERB_PORT ?? '8080'),
  forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https',
  enabledTransports: ['ws'],
  disableStats: true,
});
