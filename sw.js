/* Веселі Бобри — service worker.
   Сторінка: спершу мережа (свіжі дані), без зв'язку — остання збережена версія.
   Іконки, Chart.js, шрифти: з кешу, оновлюються у фоні. */
const CACHE = "vb-v1";
const CORE = ["./", "./manifest.webmanifest", "./icon-192.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => null)))));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isPage = req.mode === "navigate" ||
    (url.origin === location.origin && (url.pathname.endsWith("/") || url.pathname.endsWith(".html")));

  if (isPage) {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put("./", copy)); }
        return res;
      }).catch(() => caches.match("./").then(r => r || caches.match(req)))
    );
    return;
  }

  const cacheable = url.origin === location.origin ||
    /cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/.test(url.hostname);
  if (!cacheable) return;
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && (res.ok || res.type === "opaque")) {
          const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
