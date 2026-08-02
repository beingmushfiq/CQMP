import { create } from 'zustand';
import api from '../utils/api';
import { echo } from '../utils/echo';

interface User {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  roles: string[];
}

interface AuthState {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('cqmp_token'),
  user: null,
  loading: false,

  login: async (email, password) => {
    set({ loading: true });
    try {
      const response = await api.post('/login', { email, password });
      const { token, user } = response.data;
      localStorage.setItem('cqmp_token', token);
      set({ token, user: user.data, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  logout: async () => {
    // Fire-and-forget — even if the server call fails, perform full local teardown.
    try { await api.post('/logout'); } catch { /* ignore */ }

    // 1. Disconnect all Laravel Echo / Pusher / Reverb WebSocket channels
    try { echo.disconnect(); } catch { /* ignore */ }

    // 2. Clear queue polling timers and WebSocket subscriptions
    //    Lazy import to avoid circular dependency at module init time.
    try {
      const { useQueueStore } = await import('./useQueueStore');
      useQueueStore.getState().resetQueue();
    } catch { /* ignore */ }

    // 3. Wipe every CQMP key from localStorage
    const keysToRemove = Object.keys(localStorage).filter((k) => k.startsWith('cqmp_'));
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    // 4. Clear Zustand auth state
    set({ token: null, user: null });

    // 5. Hard redirect — forces React to fully unmount, preventing zombie state
    window.location.href = '/';
  },

  fetchUser: async () => {
    try {
      const response = await api.get('/me');
      set({ user: response.data.data });
    } catch {
      localStorage.removeItem('cqmp_token');
      set({ token: null, user: null });
    }
  },

  updateUser: (data) => set((state) => ({
    user: state.user ? { ...state.user, ...data } : null,
  })),
}));
