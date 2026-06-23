// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';

// https://astro.build/config
export default defineConfig({
  i18n: {
    locales: ['en', 'id'],
    defaultLocale: 'en',
    routing: {
      // EN → /en/, ID → /id/
      // One single [lang]/index.astro template serves both.
      prefixDefaultLocale: true,
    },
  },
  integrations: [icon()],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      // force Vite to re-bundle on start
      force: true,
    },
  },
});