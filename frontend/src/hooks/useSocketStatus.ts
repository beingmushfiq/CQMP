import { useEffect, useState } from 'react';
import { echo } from '../utils/echo';

export type SocketStatus = 'connected' | 'reconnecting' | 'offline';

export const useSocketStatus = (): SocketStatus => {
  const [status, setStatus] = useState<SocketStatus>('connected');

  useEffect(() => {
    const connector = (echo as any).connector;
    if (!connector || !connector.pusher) {
      return;
    }

    const pusher = connector.pusher;

    const updateStatus = (state: string) => {
      if (state === 'connected') {
        setStatus('connected');
      } else if (state === 'connecting' || state === 'reconnecting') {
        setStatus('reconnecting');
      } else {
        setStatus('offline');
      }
    };

    // Initial check
    if (pusher.connection) {
      updateStatus(pusher.connection.state);
    }

    const handleConnected = () => setStatus('connected');
    const handleConnecting = () => setStatus('reconnecting');
    const handleDisconnected = () => setStatus('offline');
    const handleUnavailable = () => setStatus('offline');
    const handleFailed = () => setStatus('offline');

    if (pusher.connection) {
      pusher.connection.bind('connected', handleConnected);
      pusher.connection.bind('connecting', handleConnecting);
      pusher.connection.bind('disconnected', handleDisconnected);
      pusher.connection.bind('unavailable', handleUnavailable);
      pusher.connection.bind('failed', handleFailed);
    }

    return () => {
      if (pusher.connection) {
        pusher.connection.unbind('connected', handleConnected);
        pusher.connection.unbind('connecting', handleConnecting);
        pusher.connection.unbind('disconnected', handleDisconnected);
        pusher.connection.unbind('unavailable', handleUnavailable);
        pusher.connection.unbind('failed', handleFailed);
      }
    };
  }, []);

  return status;
};
