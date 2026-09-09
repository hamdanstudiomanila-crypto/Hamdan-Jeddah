'use client';

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { LANGUAGE_STORAGE_KEY, normalizeLanguage, translate, type Language } from '@/lib/i18n';

const listeners = new Set<() => void>();
let currentLanguage: Language | undefined;
function getSnapshot(): Language {
  if (currentLanguage !== undefined) return currentLanguage;
  try { return normalizeLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY)); }
  catch { return 'en'; }
}
function emit() { listeners.forEach(listener => listener()); }
function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== LANGUAGE_STORAGE_KEY && event.key !== null) return;
    currentLanguage = normalizeLanguage(event.newValue);
    emit();
  };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(listener); window.removeEventListener('storage', onStorage); };
}
function setLanguage(language: Language) {
  currentLanguage = normalizeLanguage(language);
  try { localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage); } catch { /* Keep the choice for this session. */ }
  emit();
}
const getServerSnapshot = (): Language => 'en';
const LanguageContext = createContext({ language: 'en' as Language, setLanguage, t: (text: string) => text });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const language = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);
  const value = useMemo(() => ({ language, setLanguage, t: (text: string) => translate(text, language) }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() { return useContext(LanguageContext); }

/** Translate presentation copy only; never mutate stored values or user content. */
export function T({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  return <>{typeof children === 'string' ? t(children) : children}</>;
}
