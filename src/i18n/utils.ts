/**
 * i18n utility — loads locale JSON and provides type-safe access.
 *
 * Routes: /  (English, default) | /id/  (Indonesian)
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
 * English lives at root (/), Indonesian at /id/...
 * Pattern: / ↔ /id/
 */
export function getAlternateUrl(currentPath: string, currentLocale: Locale): string {
  const alt = currentLocale === 'en' ? 'id' : 'en';

  if (alt === 'id') {
    // Going to Indonesian: strip leading / content, prefix with /id
    // e.g. /about → /id/about, / → /id/
    const stripped = currentPath.replace(/^\/id/, '') || '/';
    return `/id${stripped === '/' ? '/' : stripped}`;
  } else {
    // Going to English (root): strip /id prefix
    // e.g. /id/about → /about, /id/ → /
    const stripped = currentPath.replace(/^\/id/, '') || '/';
    return stripped;
  }
}

/**
 * Return the base path for nav links based on locale.
 * English → '' (root), Indonesian → '/id'
 */
export function getBasePath(locale: Locale): string {
  return locale === 'id' ? '/id' : '';
}
