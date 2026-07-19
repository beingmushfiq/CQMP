import en from './en';
import bn from './bn';

type Lang = 'en' | 'bn';

const translations: Record<Lang, Record<string, string>> = { en, bn };

let currentLang: Lang = (localStorage.getItem('cqmp_lang') as Lang) || 'en';

export function setLanguage(lang: Lang) {
  currentLang = lang;
  localStorage.setItem('cqmp_lang', lang);
}

export function getLanguage(): Lang {
  return currentLang;
}

export function t(key: string, params?: Record<string, string | number>): string {
  let text = translations[currentLang]?.[key] || translations.en[key] || key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
    });
  }
  return text;
}
