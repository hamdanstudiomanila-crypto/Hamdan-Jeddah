'use client';

import { useId } from 'react';
import { Languages } from 'lucide-react';
import { useLanguage } from './LanguageProvider';
import { normalizeLanguage } from '@/lib/i18n';

export default function LanguageSetting() {
  const { language, setLanguage, t } = useLanguage();
  const id = useId();
  return <div className="my-3 rounded-xl border border-slate-200 bg-white p-3 text-start dark:border-slate-600 dark:bg-[#292f2b]">
    <label htmlFor={id} className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-white">
      <Languages size={16} aria-hidden="true" />{t('Display language')}
    </label>
    <select id={id} value={language} onChange={event => setLanguage(normalizeLanguage(event.target.value))}
      className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-green-600 dark:border-slate-600 dark:bg-[#202521] dark:text-white">
      <option value="en" lang="en" dir="ltr">English</option>
      <option value="ar" lang="ar" dir="rtl">العربية</option>
    </select>
    <p className="mt-2 text-[10px] leading-relaxed text-slate-500 dark:text-slate-300">{t('Saved on this browser')}</p>
  </div>;
}
