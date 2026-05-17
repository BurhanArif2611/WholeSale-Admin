import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TRANSLATIONS, Locale } from '@/constants/translations';
import { translateData } from '@/lib/translation_data';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  tData: (text: string | null) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    AsyncStorage.getItem('user-language').then((saved) => {
      // If the saved locale is one of the old English ones, migrate to the new 'en'
      if (saved === 'en-IN' || saved === 'en-US') {
        setLocaleState('en');
        return;
      }
      if (saved && TRANSLATIONS[saved as Locale]) {
        setLocaleState(saved as Locale);
      }
    });
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    AsyncStorage.setItem('user-language', newLocale);
  };

  const t = (key: string) => {
    const translation = TRANSLATIONS[locale];
    return (translation && (translation as any)[key]) || key;
  };

  const tData = (text: string | null) => text ? translateData(text, locale) : '';

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, tData }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
