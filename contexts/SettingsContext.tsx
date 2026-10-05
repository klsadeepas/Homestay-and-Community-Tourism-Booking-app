import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { Lang } from '@/constants/i18n';
import { Currency } from '@/services/currency';
import { storage, KEYS } from '@/services/storage';

type SettingsState = {
  language: Lang;
  currency: Currency;
  setLanguage: (l: Lang) => void;
  setCurrency: (c: Currency) => void;
  ready: boolean;
};

export const SettingsContext = createContext<SettingsState | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Lang>('en');
  const [currency, setCurrencyState] = useState<Currency>('LKR');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await storage.get<{ language: Lang; currency: Currency }>(KEYS.settings);
      if (stored) {
        setLanguageState(stored.language || 'en');
        setCurrencyState(stored.currency || 'LKR');
      }
      setReady(true);
    })();
  }, []);

  const persist = (lang: Lang, curr: Currency) => {
    storage.set(KEYS.settings, { language: lang, currency: curr });
  };

  const setLanguage = (l: Lang) => {
    setLanguageState(l);
    persist(l, currency);
  };
  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    persist(language, c);
  };

  return (
    <SettingsContext.Provider value={{ language, currency, setLanguage, setCurrency, ready }}>
      {children}
    </SettingsContext.Provider>
  );
}
