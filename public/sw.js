/* Meet Lounge service worker: offline shell + push. Never caches API calls (other origins). */
const CACHE = 'ml-shell-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== self.location.origin) return        // Supabase, fonts: straight to the network
  if (req.mode === 'navigate') {                                                  // page: network first, cached copy when offline
    e.respondWith(fetch(req).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put('./', c)); return r }).catch(() => caches.match('./')))
    return
  }
  e.respondWith(caches.open(CACHE).then(async (cache) => {                       // assets: cached copy now, refreshed in the background
    const hit = await cache.match(req)
    const net = fetch(req).then((r) => { if (r.ok) cache.put(req, r.clone()); return r }).catch(() => hit)
    return hit || net
  }))
})

self.addEventListener('push', (e) => {
  let d = {}
  try { d = e.data ? e.data.json() : {} } catch { d = { body: e.data && e.data.text() } }
  e.waitUntil(self.registration.showNotification(d.title || 'Meet Lounge', {
    body: d.body || '', icon: './icon-192.png', badge: './icon-192.png', tag: d.tag, dir: d.dir || 'auto', lang: d.lang,
    data: { url: d.url || './#me' },
  }))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const target = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
    const c = cs[0]
    if (c) { c.navigate(target).catch(() => {}); return c.focus() }
    return self.clients.openWindow(target)
  }))
})
