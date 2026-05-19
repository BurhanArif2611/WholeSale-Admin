import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TRANSLATIONS, DEFAULT_LOCALE, Locale } from '@/constants/translations';
import { translateData } from '@/lib/translation_data';

const STORAGE_KEY = 'user-language';

export type TranslateParams = Record<string, string | number>;

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: TranslateParams) => string;
  tData: (text: string | null) => string;
  /** Bumps when locale changes — use as React `key` to force subtree refresh */
  localeRevision: number;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function interpolate(text: string, params?: TranslateParams): string {
  if (!params) return text;
  let out = text;
  for (const [k, v] of Object.entries(params)) {
    const val = String(v);
    out = out.split(`{${k}}`).join(val);
    out = out.split(`%${k}%`).join(val);
  }
  return out;
}

function resolveTranslation(locale: Locale, key: string): string | undefined {
  const chain: Locale[] = [locale, DEFAULT_LOCALE, 'en-IN', 'en-US'];
  const seen = new Set<Locale>();
  for (const loc of chain) {
    if (seen.has(loc)) continue;
    seen.add(loc);
    const table = TRANSLATIONS[loc];
    const value = table?.[key];
    if (value && value !== key) return value;
  }
  return undefined;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [localeRevision, setLocaleRevision] = useState(0);
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'en-IN' || saved === 'en-US') {
        setLocaleState(DEFAULT_LOCALE);
      } else if (saved && TRANSLATIONS[saved as Locale]) {
        setLocaleState(saved as Locale);
      }
    });
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    setLocaleRevision((r) => r + 1);
    void AsyncStorage.setItem(STORAGE_KEY, newLocale);
  }, []);

  const t = useCallback(
    (key: string, params?: TranslateParams) => {
      const resolved = resolveTranslation(locale, key) ?? humanizeKey(key);
      return interpolate(resolved, params);
    },
    [locale],
  );

  const tData = useCallback(
    (text: string | null) => (text ? translateData(text, locale) : ''),
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, tData, localeRevision }),
    [locale, setLocale, t, tData, localeRevision],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
