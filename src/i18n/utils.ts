/**
 * i18n utility — loads locale JSON and provides type-safe access.
 *
 * Routes: /en/  (English) | /id/  (Indonesian)
 * Single source of truth: src/locales/{en,id}.json
 */

import en from '../locales/en.json';
import id from '../locales/id.json';

export type Locale = 'en' | 'id';

const locales = { en, id } as const;

/** Dot-notation key accessor with EN fallback */
export function useTranslations(locale: Locale = 'en') {
  const dict = locales[locale] as Record<string, unknown>;

  return function t(key: string): string {
    const parts = key.split('.');
    let value: unknown = dict;
    for (const part of parts) {
      if (typeof value === 'object' && value !== null && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        // Fallback to English
        let fb: unknown = locales.en as Record<string, unknown>;
        for (const p of parts) {
          if (typeof fb === 'object' && fb !== null && p in fb) {
            fb = (fb as Record<string, unknown>)[p];
          } else return key;
        }
        return typeof fb === 'string' ? fb : key;
      }
    }
    return typeof value === 'string' ? value : key;
  };
}

/** Narrow an arbitrary string to Locale (defaults to 'en') */
export function getLocale(raw: string | undefined): Locale {
  return raw === 'id' ? 'id' : 'en';
}

/** Return the entire locale data object */
export function getLocaleData(locale: Locale) {
  return locales[locale];
}

/**
 * Given current locale, return the URL for the alternate locale.
 * Pattern: /en/... ↔ /id/...
 */
export function getAlternateUrl(currentPath: string, currentLocale: Locale): string {
  const alt = currentLocale === 'en' ? 'id' : 'en';
  // Replace leading /en or /id prefix
  const stripped = currentPath.replace(/^\/(en|id)/, '');
  return `/${alt}${stripped || '/'}`;
}
