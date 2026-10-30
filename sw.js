/* Momo PWA service worker.
 * Bump VERSION when shipping changes; the page's offline-audio cache uses the
 * same cache name in index.html (search for PWA_CACHE). */
const VERSION = 'momo-static-v1';
const CACHE = VERSION;
const SCOPE = new URL('./', self.location).href;
const AUDIO_PREFIX = new URL('audio/', SCOPE).pathname;
const CORE = [
  SCOPE,
  SCOPE + 'index.html',
  SCOPE + 'manifest.webmanifest',
  SCOPE + 'icons/icon-192.png',
  SCOPE + 'icons/icon-512.png',
  SCOPE + 'icons/icon-maskable-512.png',
  SCOPE + 'icons/apple-touch-icon.png',
  SCOPE + 'icons/favicon-32.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((key) => key.startsWith('momo-') && key !== CACHE)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  try {
    const response = await fetch(request);
    if (response && response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    return Response.error();
  }
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put(SCOPE + 'index.html', response.clone());
    }
    return response;
  } catch (error) {
    return (await cache.match(SCOPE + 'index.html')) || (await cache.match(SCOPE));
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  const network = fetch(request).then((response) => {
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => hit || Response.error());
  return hit || network;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/sw.js')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (url.pathname.startsWith(AUDIO_PREFIX) && !url.pathname.endsWith('manifest.json')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
