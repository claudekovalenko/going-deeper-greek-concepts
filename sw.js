// Offline shell.
//
// Stale-while-revalidate, never plain cache-first: cache-first meant a phone
// that had once loaded the app kept serving that version for ever. Every load
// paints instantly from cache *and* refreshes the cache behind it, so the next
// load is current. Bump CACHE alongside BUILD in js/app.js.
const CACHE = 'greek-cases-v7';

const SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './data/concepts.json',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(SHELL);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(request, { ignoreSearch: true });

      const fresh = fetch(request)
        .then((res) => {
          if (res && res.ok) cache.put(request, res.clone());
          return res;
        })
        .catch(() => null);

      // Painted from cache if we have it; the network copy lands for next time.
      if (hit) {
        event.waitUntil(fresh);
        return hit;
      }
      const res = await fresh;
      if (res) return res;
      // Offline and never cached: a navigation still gets the app shell.
      if (request.mode === 'navigate') return (await cache.match('./index.html')) || Response.error();
      return Response.error();
    })()
  );
});
