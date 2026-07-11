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
