import type { APIRoute } from 'astro';
import pkg from '../../package.json';

export const GET: APIRoute = () => {
  const CACHE_NAME = `hero-frames-cache-v${pkg.version}`;
  
  const script = `
const CACHE_NAME = '${CACHE_NAME}';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Cache hero frames with a long-lived cache
  if (url.pathname.startsWith('/frame/hero-') && url.pathname.endsWith('.webp')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetchWithRetry(event.request, 3).then((response) => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        });
      })
    );
  }
});

function fetchWithRetry(request, maxRetries) {
  return new Promise(function(resolve, reject) {
    var attempt = 0;
    function tryFetch() {
      fetch(request).then(function(response) {
        if (response.ok || attempt >= maxRetries - 1) {
          resolve(response);
        } else {
          attempt++;
          setTimeout(tryFetch, 600 * attempt);
        }
      }).catch(function(err) {
        if (attempt >= maxRetries - 1) {
          reject(err);
        } else {
          attempt++;
          setTimeout(tryFetch, 600 * attempt);
        }
      });
    }
    tryFetch();
  });
}
`;

  return new Response(script, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
    },
  });
};
