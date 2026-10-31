/* Momo PWA service worker.
 * Shell and audio have separate caches:
 *   - bump VERSION for shell/UI changes;
 *   - bump AUDIO_CACHE only when audio files change.
 * That way a normal deploy keeps the downloaded audio instead of wiping it.
 * Old `momo-static-*` caches (shell + audio together) are migrated on activate. */
const VERSION = 'v4';
const SHELL_CACHE = 'momo-shell-' + VERSION;
const AUDIO_CACHE = 'momo-audio-v1';
const LEGACY_PREFIX = 'momo-static-';
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
  // Take over on the next load instead of waiting for every tab to close.
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(CORE))
  );
});

// The page asks for the active audio cache name instead of hard-coding it, so
// index.html and sw.js cannot drift apart after a version bump.
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'GET_CACHES' && event.ports && event.ports[0]) {
    event.ports[0].postMessage({ shellCache: SHELL_CACHE, audioCache: AUDIO_CACHE });
  }
});

// Older versions stored shell and audio in the same `momo-static-*` cache.
// Copy the audio entries into the new audio cache before removing the old cache.
async function migrateLegacyAudio() {
  const keys = await caches.keys();
  const legacy = keys.filter((key) => key.startsWith(LEGACY_PREFIX));
  if (!legacy.length) return;
  const audio = await caches.open(AUDIO_CACHE);
  for (const key of legacy) {
    try {
      const source = await caches.open(key);
      const requests = await source.keys();
      for (const req of requests) {
        const url = new URL(req.url);
        if (!url.pathname.startsWith(AUDIO_PREFIX) || url.pathname.endsWith('/manifest.json')) continue;
        if (await audio.match(req.url)) continue;
        const response = await source.match(req);
        if (response && response.status === 200) {
          try { await audio.put(req.url, response); } catch (error) { /* quota */ }
        }
      }
    } catch (error) { /* unreadable legacy cache */ }
    await caches.delete(key);
  }
}

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await migrateLegacyAudio();
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((key) => (
        (key.startsWith('momo-shell-') && key !== SHELL_CACHE) ||
        (key.startsWith('momo-audio-') && key !== AUDIO_CACHE)
      )).map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

function audioCacheFirst(request, event) {
  const key = new URL(request.url).href;

  // Start the cache work and register it with waitUntil synchronously; some
  // browsers reject waitUntil() if it is called after an await.
  const task = (async () => {
    const cache = await caches.open(AUDIO_CACHE);
    const hit = await cache.match(key);
    // Only a complete 200 response is safe to reuse. A cached 206 slice makes
    // the next playback fail with a format error, so drop partial entries.
    if (hit && hit.status === 200) return { response: hit, cacheWork: null };
    if (hit) await cache.delete(key);

    let response;
    try {
      response = await fetch(request);
    } catch (error) {
      return { response: Response.error(), cacheWork: null };
    }

    if (response && response.status === 200) {
      return {
        response,
        cacheWork: cache.put(key, response.clone()).catch(() => {})
      };
    }

    // Media elements send Range requests and GitHub Pages answers 206. Return
    // the partial response for playback, but fetch and cache a full copy so the
    // clip is available offline next time.
    if (response && response.status === 206) {
      const cacheWork = (async () => {
        try {
          const full = await fetch(key, { cache: 'no-store' });
          if (full && full.status === 200) await cache.put(key, full);
        } catch (error) { /* offline/quota */ }
      })();
      return { response, cacheWork };
    }

    return { response, cacheWork: null };
  })();

  event.waitUntil(task.then((result) => result.cacheWork).catch(() => {}));
  return task.then((result) => result.response).catch(() => Response.error());
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put(SCOPE + 'index.html', response.clone());
    }
    return response;
  } catch (error) {
    return (await cache.match(SCOPE + 'index.html')) || (await cache.match(SCOPE)) || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(SHELL_CACHE);
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
    event.respondWith(audioCacheFirst(request, event));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
