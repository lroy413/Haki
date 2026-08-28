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

const VERSION = 'haki-v3';
const SHELL = '/';

/**
 * The strip behind the clock, painted where iOS actually reads it.
 *
 * The app starts below the status bar, and iOS colours the strip with the
 * page's theme-color — read from the STATICALLY PARSED HTML, never from the
 * DOM. Measured on the phone: with the boot script and the provider both
 * rewriting the meta to the live ground, the strip still wore the constant
 * baked into the exported file. Script writes are invisible to it.
 *
 * The served bytes are the one thing upstream of that parse, and they pass
 * through here. The page reports its ground (and the voyage-day boundary)
 * after every palette change; navigations get the meta rewritten to the
 * ground the day will open on before iOS ever sees the document.
 */
const GROUND_KEY = '/__haki-ground';
let groundState = null;

async function loadGround() {
  if (groundState) return groundState;
  try {
    const cached = await caches.open(VERSION).then((c) => c.match(GROUND_KEY));
    if (cached) groundState = await cached.json();
  } catch {
    /* a colour is never worth failing a navigation */
  }
  return groundState;
}

async function saveGround(state) {
  groundState = state;
  try {
    const cache = await caches.open(VERSION);
    await cache.put(GROUND_KEY, new Response(JSON.stringify(state)));
  } catch {
    /* memory still holds it for this worker's lifetime */
  }
}

/** The ground the app will open on: stored within the day, paper past it. */
function openingGround(state) {
  if (!state || !/^#[0-9A-Fa-f]{6}$/.test(state.ground || '')) return null;
  if (state.until > 0 && Date.now() >= state.until) return '#EDE7DA';
  return state.ground;
}

async function paint(response) {
  const state = await loadGround();
  const ground = openingGround(state);
  if (!ground) return response;
  const text = await response.text();
  const painted = text.replace(
    /(<meta name="theme-color" content=")#[0-9A-Fa-f]{6}(")/,
    `$1${ground}$2`,
  );
  // Copy the headers minus the encoding pair: the body has been decoded by
  // text(), and advertising the old encoding or length would corrupt it.
  const headers = new Headers(response.headers);
  headers.delete('content-encoding');
  headers.delete('content-length');
  return new Response(painted, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

self.addEventListener('message', (event) => {
  const data = event.data;
  if (data && data.type === 'haki-ground') {
    event.waitUntil(saveGround({ ground: data.ground, until: data.until || 0 }));
  }
});

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
          return paint(response);
        })
        .catch(() =>
          caches.match(SHELL).then((cached) => (cached ? paint(cached) : Response.error())),
        ),
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
