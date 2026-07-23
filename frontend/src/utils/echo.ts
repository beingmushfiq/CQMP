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
