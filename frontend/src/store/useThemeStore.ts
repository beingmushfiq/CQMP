import { create } from 'zustand';

type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  // Read the current theme from localStorage (already applied to DOM by index.html inline script).
  theme: (localStorage.getItem('cqmp_theme') as Theme) || 'light',

  toggleTheme: () => {
    // Read from localStorage to stay in sync, never use stale Zustand state.
    const current = (localStorage.getItem('cqmp_theme') as Theme) || 'light';
    const next: Theme = current === 'dark' ? 'light' : 'dark';

    localStorage.setItem('cqmp_theme', next);

    // Directly toggle the class on <html> — this is what Tailwind `darkMode: 'class'` watches.
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Update Zustand state so the sun/moon icon re-renders.
    set({ theme: next });
  },
}));
