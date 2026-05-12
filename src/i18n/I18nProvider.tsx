'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
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

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');

  const t = useCallback((key: string): string => {
    return dictionaries[locale][key] || key;
  }, [locale]);

  const toggleLocale = useCallback(() => {
    setLocale(prev => prev === 'en' ? 'zh-TW' : 'en');
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
