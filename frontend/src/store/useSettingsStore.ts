import { create } from 'zustand';
import api from '../utils/api';

interface SettingsState {
  settings: Record<string, string>;
  loaded: boolean;
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: Record<string, string | null>) => Promise<void>;
  get: (key: string, fallback?: string) => string;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {},
  loaded: false,

  fetchSettings: async () => {
    try {
      const res = await api.get('/settings');
      set({ settings: res.data, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  updateSettings: async (newSettings) => {
    const res = await api.put('/settings', { settings: newSettings });
    set({ settings: res.data });
  },

  get: (key, fallback = '') => get().settings[key] || fallback,
}));
