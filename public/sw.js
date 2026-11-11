/* Swaram service worker — app-shell + offline playback support.
   Downloaded songs live in IndexedDB (played via blob URLs), this worker keeps the UI + artwork available offline. */
const VERSION = "v1";
const SHELL = `swaram-shell-${VERSION}`;
const STATIC = `swaram-static-${VERSION}`;
const IMG = "swaram-img";
const PRECACHE = ["/", "/downloads", "/library", "/liked", "/settings", "/icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) => Promise.allSettled(PRECACHE.map((u) => cache.add(u)))).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("swaram-") && k !== SHELL && k !== STATIC && k !== IMG).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // never touch API / audio / range requests
  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) return;
  if (req.headers.has("range")) return;

  // page navigations: network first, fall back to cache
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put(req, copy));
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match("/downloads")) || (await caches.match("/")) || Response.error()),
    );
    return;
  }

  // immutable build assets: cache first
  if (url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(STATIC).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // artwork: stale-while-revalidate (works with opaque cross-origin responses)
  if (req.destination === "image") {
    event.respondWith(
      caches.open(IMG).then(async (cache) => {
        const hit = await cache.match(req);
        const net = fetch(req)
          .then((res) => {
            if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || net;
      }),
    );
  }
});
