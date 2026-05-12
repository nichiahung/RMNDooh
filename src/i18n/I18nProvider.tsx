'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Locale, dictionaries } from './dictionaries';

interface I18nContextType {
  locale: Locale;
  t: (key: string) => string;
  toggleLocale: () => void;
}

const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  t: (key: string) => key,
  toggleLocale: () => {},
});

const STORAGE_KEY = 'dooh-locale';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && (saved === 'en' || saved === 'zh-TW')) setLocale(saved);
  }, []);

  const t = useCallback((key: string): string => {
    return dictionaries[locale][key] || key;
  }, [locale]);

  const toggleLocale = useCallback(() => {
    setLocale(prev => {
      const next: Locale = prev === 'en' ? 'zh-TW' : 'en';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return (
    <I18nContext.Provider value={{ locale, t, toggleLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
