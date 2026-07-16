const CACHE_NAME = 'brian-ai-field-v5-public-site'
const API_CACHE_NAME = 'brian-ai-api-v1'
const SHELL = ['/', '/app', '/index.html', '/field', '/manifest.json', '/favicon.svg', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names
        .filter((name) => ![CACHE_NAME, API_CACHE_NAME].includes(name))
        .map((name) => caches.delete(name))
    ))
  )
  self.clients.claim()
})

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (response.ok) await cache.put(request, response.clone())
    return response
  } catch {
    return (await cache.match(request)) || Response.error()
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)
  const refresh = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone())
    return response
  }).catch(() => cached)
  return cached || refresh
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE_NAME))
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(async () => (
          (await caches.match(request)) ||
          (await caches.match('/app')) ||
          (await caches.match('/index.html')) ||
          Response.error()
        ))
    )
    return
  }

  event.respondWith(staleWhileRevalidate(request))
})
