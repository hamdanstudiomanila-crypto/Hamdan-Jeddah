"use client";

import { useLanguage } from './LanguageProvider';

export default function LanguageSetting({ disabled = false }: { disabled?: boolean }) {
  const { language, setLanguage } = useLanguage();
  return <div role="group" aria-label="Display language" dir="ltr" className="flex items-center gap-1 text-sm font-bold">
    <button type="button" lang="en" aria-label="English" aria-pressed={language === 'en'} disabled={disabled} onClick={() => setLanguage('en')} className={`min-h-11 min-w-11 rounded-xl px-2 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50 ${language === 'en' ? 'text-slate-950 dark:bg-white/5 dark:text-white' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}>EN</button>
    <span aria-hidden="true" className="text-slate-300 dark:text-slate-500">|</span>
    <button type="button" lang="ar" aria-label="Arabic" aria-pressed={language === 'ar'} disabled={disabled} onClick={() => setLanguage('ar')} className={`min-h-11 min-w-11 rounded-xl px-2 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50 ${language === 'ar' ? 'text-slate-950 dark:bg-white/5 dark:text-white' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}>{'\u0639\u0631\u0628\u064a'}</button>
  </div>;
}
