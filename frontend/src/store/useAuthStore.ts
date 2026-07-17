import { create } from 'zustand';
import api from '../utils/api';

interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
}

interface AuthState {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
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
}));
