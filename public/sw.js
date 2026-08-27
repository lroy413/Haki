/**
 * Haki service worker.
 *
 * Runtime caching only — no build-time precache manifest to keep in sync.
 * The bundle filenames are content-hashed, so whatever the app actually
 * fetches on a first online load is what gets cached, and every later load
 * works offline.
 *
 * Two strategies:
 *   navigations  — network first, falling back to the cached shell. Keeps you
 *                  on the newest build when online, still opens on a plane.
 *   everything   — stale-while-revalidate. Instant from cache, refreshed in
 *                  the background for next time.
 *
 * The database is NOT here. It lives in OPFS via SQLite and is never touched
 * by this file — clearing the cache does not touch a single journal entry.
 */

const VERSION = 'haki-v2';
const SHELL = '/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll([SHELL]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put(SHELL, copy));
          return response;
        })
        .catch(() => caches.match(SHELL).then((cached) => cached || Response.error())),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || network;
    }),
  );
});
