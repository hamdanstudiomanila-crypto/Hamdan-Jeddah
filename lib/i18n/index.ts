import arabic from './ar.json';

export type Language = 'en' | 'ar';
export const LANGUAGE_STORAGE_KEY = 'hamdan-jeddah.language.v1';
export const messages: Readonly<Record<string, string>> = arabic;

export function normalizeLanguage(value: unknown): Language {
  return value === 'ar' ? 'ar' : 'en';
}

export function translate(text: string, language: Language): string {
  if (language === 'en') return text;
  const key = text.replace(/\s+/g, ' ').trim();
  const translated = Object.prototype.hasOwnProperty.call(messages, key) ? messages[key] : undefined;
  if (!translated) return text;
  return `${text.match(/^\s*/)?.[0] ?? ''}${translated}${text.match(/\s*$/)?.[0] ?? ''}`;
}
