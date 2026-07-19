import { create } from 'zustand';
import api from '../utils/api';

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

    // Demo bypass — no backend needed
    if ((email === 'admin' || email === 'admin@cqmp.local') && password === '12345678') {
      const demoUser: User = {
        id: 1,
        name: 'Admin',
        email: 'admin@cqmp.local',
        avatar: null,
        roles: ['Super Admin'],
      };
      const demoToken = 'demo-token';
      localStorage.setItem('cqmp_token', demoToken);
      set({ token: demoToken, user: demoUser, loading: false });
      return;
    }

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
    try {
      await api.post('/logout');
    } catch (e) {
      // Allow local logout anyway
    } finally {
      localStorage.removeItem('cqmp_token');
      set({ token: null, user: null });
    }
  },

  fetchUser: async () => {
    try {
      const response = await api.get('/me');
      set({ user: response.data.data });
    } catch (error) {
      localStorage.removeItem('cqmp_token');
      set({ token: null, user: null });
    }
  },

  updateUser: (data) => set((state) => ({
    user: state.user ? { ...state.user, ...data } : null,
  })),
}));
