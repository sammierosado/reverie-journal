/* Reverie Journal service worker — generated at build time by vite.config.ts.
 * Caches the application shell only. Journal data lives in IndexedDB and is never touched here. */
const CACHE = 'reverie-__VERSION__'
const PRECACHE = __PRECACHE__
/** The app's own page, wherever it is hosted (domain root or a subpath). */
const SHELL = new URL('./', self.location).href

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('reverie-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return

  // Pages: try the network for updates, fall back to the cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(SHELL, copy))
          return response
        })
        .catch(() => caches.match(SHELL, { ignoreVary: true }).then((r) => r || Response.error())),
    )
    return
  }

  // Fingerprinted assets never change, so the cache is always right. `ignoreVary` because module
  // scripts are requested in CORS mode (with an Origin header) but were precached without one.
  event.respondWith(caches.match(request, { ignoreVary: true }).then((cached) => cached || fetch(request)))
})
