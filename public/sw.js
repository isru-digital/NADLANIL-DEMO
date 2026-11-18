/* The app's Service Worker (Itzik 18.11.2026, stage 1 of phone notices). It lives next to the page, so its scope is
   the whole site under the base address. What it does, and only this:
   1. Pages: always from the network, so a new version is seen at once. Only when there is no connection does it show
      a small page of its own ("אין חיבור"), never an old copy of the site.
   2. The built files under assets/ carry their content's hash in the name, so they never change: kept after the first
      load, which makes opening the app from the home screen faster.
   The icons are kept from the first visit too, so the offline page can show one.
   3. Ready for the next stages: shows a notice that the server sends (push), and a tap on it opens the right screen.
      Nothing sends notices yet; the server part is stage 3.
   It never touches requests to other addresses (the server's API, fonts), and never anything but GET. */

const VERSION = 'v1'
const SHELL = `app-shell-${VERSION}`
const BUILT = 'app-built'
const BASE = new URL('./', self.location).pathname
const OFFLINE = `${BASE}offline.html`

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((c) => c.addAll([OFFLINE, `${BASE}icons/app-192.png`]))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('app-shell-') && k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return

  // a page: the network first; with no connection, the offline page
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(offlinePage))
    return
  }
  // the app's icons (the offline page shows one): from the store if it has them
  if (url.pathname.startsWith(`${BASE}icons/`)) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req)))
    return
  }
  // a built file: from the store if it is there, otherwise from the network and kept
  if (url.pathname.startsWith(`${BASE}assets/`)) {
    event.respondWith(
      caches.open(BUILT).then((c) =>
        c.match(req).then(
          (hit) =>
            hit ||
            fetch(req).then((res) => {
              if (res.ok) c.put(req, res.clone()).then(() => trim(c))
              return res
            }),
        ),
      ),
    )
  }
})

// the offline page answers for any address (say /app/community), so it is told where the site's root is, for its icon
function offlinePage() {
  return caches
    .match(OFFLINE)
    .then((res) => (res ? res.text() : '<!doctype html><meta charset="utf-8"><title>אין חיבור</title><p dir="rtl">אין חיבור לאינטרנט כרגע.</p>'))
    .then((html) => new Response(html.replace('<head>', `<head><base href="${BASE}">`), { headers: { 'content-type': 'text/html; charset=utf-8' } }))
}

// every new version adds files with new names: keep only the newest ones, so the store does not grow forever
const KEEP = 80
function trim(c) {
  return c.keys().then((keys) => Promise.all(keys.slice(0, Math.max(0, keys.length - KEEP)).map((k) => c.delete(k))))
}

/* ------------------------------------------------------------------ notices (sent by the server from stage 3) */
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'מתווכים לעסקאות'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: `${BASE}icons/app-192.png`,
      badge: `${BASE}icons/app-96.png`,
      dir: 'rtl',
      lang: 'he',
      tag: data.tag,
      data: { url: data.url || `${BASE}app/community` },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || BASE, self.location.origin)
  // only screens of this site open from a notice
  const url = target.origin === self.location.origin && target.pathname.startsWith(BASE) ? target.href : new URL(BASE, self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const open = wins.find((w) => new URL(w.url).pathname.startsWith(BASE))
      if (open) return open.focus().then((w) => (w && 'navigate' in w ? w.navigate(url) : w))
      return self.clients.openWindow(url)
    }),
  )
})
