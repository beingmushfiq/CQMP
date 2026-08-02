import { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';
import { echo } from '../utils/echo';

export type DisplayMode = 'NORMAL' | 'BREAK' | 'REPORT' | 'EMERGENCY' | 'LUNCH' | 'PRAYER' | 'OFFLINE' | 'MAINTENANCE' | 'CUSTOM';

export interface DisplayState {
  mode: DisplayMode;
  title_bn: string | null;
  title_en: string | null;
  message_bn: string | null;
  message_en: string | null;
  resume_time: string | null;
  activated_by: string;
  timestamp: string;
  metadata?: Record<string, any> | null;
}

export const useDisplayMode = () => {
  const [displayState, setDisplayState] = useState<DisplayState>({
    mode: 'NORMAL',
    title_bn: null,
    title_en: null,
    message_bn: null,
    message_en: null,
    resume_time: null,
    activated_by: 'System',
    timestamp: new Date().toISOString(),
  });

  const [loading, setLoading] = useState(true);

  // Fetch the latest state from the database API
  const fetchLatestState = useCallback(async () => {
    try {
      const res = await api.get('/display/mode');
      setDisplayState(res.data);
    } catch (err) {
      console.error('[CQMP] Failed to fetch display state:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Initial state load
    fetchLatestState();

    // 2. Setup socket channel subscription (using public fallback or echo logic)
    const channelName = 'display-state';
    
    // Clean up channel to prevent listener piling
    echo.leave(channelName);
    const channel = echo.channel(channelName);

    const handleModeChanged = (payload: DisplayState) => {
      console.log('[CQMP] Display mode changed:', payload);
      setDisplayState(payload);
    };

    const handleModeResumed = (payload: DisplayState) => {
      console.log('[CQMP] Display mode resumed:', payload);
      setDisplayState(payload);
    };

    channel
      .listen('display.mode.changed', handleModeChanged)
      .listen('.display.mode.changed', handleModeChanged)
      .listen('display.mode.resumed', handleModeResumed)
      .listen('.display.mode.resumed', handleModeResumed);

    // 3. Failover / Reconnection handler: fetch latest display mode when socket reconnects
    const handleReconnect = () => {
      console.log('[CQMP] Socket reconnected. Refreshing display mode state...');
      fetchLatestState();
    };

    // Reverb/Pusher underlying socket hook
    const connector = (echo as any).connector;
    if (connector && connector.pusher) {
      connector.pusher.connection.bind('connected', handleReconnect);
    }

    return () => {
      echo.leave(channelName);
      if (connector && connector.pusher) {
        connector.pusher.connection.unbind('connected', handleReconnect);
      }
    };
  }, [fetchLatestState]);

  // Methods to transition display state (for staff roles)
  const setMode = async (mode: DisplayMode, params: Partial<DisplayState> = {}) => {
    try {
      await api.post('/display/mode', { mode, ...params });
      // The socket event will broadcast back and set state locally automatically.
    } catch (err) {
      console.error('[CQMP] Transition state failed:', err);
      throw err;
    }
  };

  const resume = async () => {
    try {
      await api.post('/display/resume');
    } catch (err) {
      console.error('[CQMP] Resume state failed:', err);
      throw err;
    }
  };

  return {
    ...displayState,
    loading,
    setMode,
    resume,
    refresh: fetchLatestState
  };
};
