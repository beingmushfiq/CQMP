import { create } from 'zustand';
import { setLanguage, getLanguage, t as translate } from '../i18n';

type TranslateFn = typeof translate;

interface LanguageState {
  lang: 'en' | 'bn';
  toggle: () => void;
  set: (lang: 'en' | 'bn') => void;
  t: TranslateFn;
}

// Wrap t() so its reference changes when lang changes, triggering Zustand re-renders
function createT(_lang: 'en' | 'bn'): TranslateFn {
  return ((key: string, params?: Record<string, string | number>) => {
    return translate(key, params);
  }) as TranslateFn;
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  lang: getLanguage(),
  toggle: () => {
    const next = get().lang === 'en' ? 'bn' : 'en';
    setLanguage(next);
    set({ lang: next, t: createT(next) });
  },
  set: (lang) => {
    setLanguage(lang);
    set({ lang, t: createT(lang) });
  },
  t: createT(getLanguage()),
}));
