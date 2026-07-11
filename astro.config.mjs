// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import sitemap from '@astrojs/sitemap';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://aleafarrel-id.github.io',
  server: {
    host: true,
  },
  i18n: {
    locales: ['en', 'id'],
    defaultLocale: 'en',
    routing: {
      // EN → /, ID → /id/
      // English serves at root, no redirect needed. Clean for GitHub Pages + SEO.
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    icon(),
    react(),
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en',
          id: 'id',
        },
      },
    }),
  ],
  build: {
    inlineStylesheets: 'always'
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              const modulePath = id.split('node_modules/')[1];
              const topLevelFolder = modulePath.split('/')[0];
              if (topLevelFolder !== '.pnpm') {
                return topLevelFolder;
              }
              const scopedMatch = modulePath.match(/\.pnpm\/(@[^/]+\/[^/@]+)/);
              if (scopedMatch) {
                return scopedMatch[1].replace('@', '').replace('/', '-');
              }
              const match = modulePath.match(/\.pnpm\/([^/@]+)/);
              if (match) {
                return match[1];
              }
              return 'vendor';
            }
          }
        }
      }
    }
  },
});