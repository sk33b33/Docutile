/* Docutile service worker: makes the app installable and usable offline.
 * It only ever caches the app itself (pages, scripts, icons). Your documents live in IndexedDB and are never
 * sent to or stored by the worker. Bump VERSION when this file's strategy changes. */
const VERSION = "v1";
const STATIC_CACHE = `docutile-static-${VERSION}`;
const PAGE_CACHE = `docutile-pages-${VERSION}`;
const PRECACHE_PAGES = ["/", "/packs/new", "/templates", "/library", "/activity", "/settings", "/offline.html"];
const PRECACHE_ASSETS = ["/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const pages = await caches.open(PAGE_CACHE);
      const assets = await caches.open(STATIC_CACHE);
      // Individually tolerant: one failing URL must not stop the worker installing.
      await Promise.allSettled([
        ...PRECACHE_PAGES.map((u) => pages.add(new Request(u, { cache: "reload" }))),
        ...PRECACHE_ASSETS.map((u) => assets.add(new Request(u, { cache: "reload" }))),
      ]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC_CACHE, PAGE_CACHE]);
      for (const name of await caches.keys()) if (name.startsWith("docutile-") && !keep.has(name)) await caches.delete(name);
      await self.clients.claim();
    })(),
  );
});

/** The page asks us to remember a route it has just shown (in-app navigation never fetches the HTML itself). */
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "CACHE_URL" || typeof data.url !== "string") return;
  const url = new URL(data.url, self.location.origin);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/_next/") || url.pathname.startsWith("/api/")) return;
  event.waitUntil(
    (async () => {
      try {
        const res = await fetch(new Request(url.pathname, { headers: { Accept: "text/html" }, cache: "no-store" }));
        if (res.ok && (res.headers.get("content-type") || "").includes("text/html")) {
          await (await caches.open(PAGE_CACHE)).put(url.pathname, res.clone());
        }
      } catch {
        /* offline: keep whatever we already have */
      }
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Hashed build assets never change: cache-first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })(),
    );
    return;
  }

  // Pages: network-first so updates show up, falling back to the last copy, then the offline page.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PAGE_CACHE);
        try {
          const res = await fetch(req);
          if (res.ok && (res.headers.get("content-type") || "").includes("text/html")) cache.put(url.pathname, res.clone());
          return res;
        } catch {
          return (await cache.match(url.pathname)) || (await cache.match("/offline.html")) || Response.error();
        }
      })(),
    );
    return;
  }

  // Icons, manifest, other same-origin files: network-first with a cached fallback.
  if (url.pathname.startsWith("/icons/") || url.pathname === "/manifest.webmanifest" || url.pathname === "/icon.svg") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch {
          return (await cache.match(req)) || Response.error();
        }
      })(),
    );
  }
});
