import { create } from 'zustand';
import { setLanguage, getLanguage, t } from '../i18n';

interface LanguageState {
  lang: 'en' | 'bn';
  toggle: () => void;
  set: (lang: 'en' | 'bn') => void;
  t: typeof t;
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  lang: getLanguage(),
  toggle: () => {
    const next = get().lang === 'en' ? 'bn' : 'en';
    setLanguage(next);
    set({ lang: next });
  },
  set: (lang) => {
    setLanguage(lang);
    set({ lang });
  },
  t: (...args: Parameters<typeof t>) => t(...args),
}));
