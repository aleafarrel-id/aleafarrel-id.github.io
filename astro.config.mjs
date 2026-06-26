// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  server: {
    host: true,
  },
  i18n: {
    locales: ['en', 'id'],
    defaultLocale: 'en',
    routing: {
      // EN → /en/, ID → /id/
      // One single [lang]/index.astro template serves both.
      prefixDefaultLocale: true,
    },
  },
  integrations: [icon(), react()],
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