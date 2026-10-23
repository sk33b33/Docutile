/* Docutile service worker: makes the app installable and usable offline.
 * It only ever caches the app itself (pages, scripts, icons). Your documents live in IndexedDB and are never
 * sent to or stored by the worker. Bump VERSION when this file's strategy changes. */
const VERSION = "v5";
const STATIC_CACHE = `docutile-static-${VERSION}`;
const PAGE_CACHE = `docutile-pages-${VERSION}`;
const PRECACHE_PAGES = ["/", "/packs/new", "/templates", "/library", "/activity", "/settings", "/offline.html"]; // all but the offline page are saved by warmUp()
const PRECACHE_ASSETS = ["/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/icon.svg"];

/** Build assets a page needs: scripts, styles and fonts named in its HTML or in the scripts it loads. */
const ASSET_RE = /(?:\/_next\/)?static\/(?:chunks|css|media)\/[\w.\-~%]+\.(?:js|css|woff2?)(?:\?[\w=&.%-]+)?/g;

/** Saves every asset a page references (and, two levels down, what its scripts reference) so it works offline. */
async function cacheAssets(text, cache, depth = 0, seen = new Set()) {
  const urls = new Set((text.match(ASSET_RE) || []).map((u) => (u.startsWith("/_next/") ? u : "/_next/" + u)));
  for (const u of urls) {
    if (seen.has(u) || seen.size > 120) continue;
    seen.add(u);
    let res = await cache.match(u); // exact URL: some assets (workers) get their configuration through the query string
    if (!res) {
      try {
        const fresh = await fetch(u);
        if (!fresh.ok) continue;
        await cache.put(u, fresh.clone());
        res = fresh;
      } catch {
        continue;
      }
    }
    if (depth < 2 && /\.js(\?|$)/.test(u)) await cacheAssets(await res.clone().text(), cache, depth + 1, seen);
  }
}

async function cachePageAssets(response) {
  try {
    await cacheAssets(await response.clone().text(), await caches.open(STATIC_CACHE));
  } catch {
    /* best effort: the page itself is already saved */
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const pages = await caches.open(PAGE_CACHE);
      const assets = await caches.open(STATIC_CACHE);
      // Only the essentials, so installing never competes with the page that is loading right now.
      // Individually tolerant: one failing URL must not stop the worker installing.
      await Promise.allSettled([
        pages.add(new Request("/offline.html", { cache: "reload" })),
        ...PRECACHE_ASSETS.map((u) => assets.add(new Request(u, { cache: "reload" }))),
      ]);
      await self.skipWaiting();
    })(),
  );
});

/** Saves the main pages and their scripts for offline use, one page at a time, when the app is idle. */
async function warmUp() {
  const pages = await caches.open(PAGE_CACHE);
  for (const path of PRECACHE_PAGES) {
    if (path === "/offline.html" || (await pages.match(path))) continue;
    try {
      const res = await fetch(new Request(path, { headers: { Accept: "text/html" }, cache: "no-store" }));
      // A signed-out visit is redirected to the sign-in page: never store that under another URL.
      if (!res.ok || res.redirected || !(res.headers.get("content-type") || "").includes("text/html")) continue;
      await pages.put(path, res.clone());
      await cachePageAssets(res);
    } catch {
      return; // offline or the server is busy: try again at the next visit
    }
  }
}

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
  if (data && data.type === "WARM") {
    event.waitUntil(warmUp());
    return;
  }
  if (!data || data.type !== "CACHE_URL" || typeof data.url !== "string") return;
  const url = new URL(data.url, self.location.origin);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/_next/") || url.pathname.startsWith("/api/")) return;
  event.waitUntil(
    (async () => {
      try {
        const res = await fetch(new Request(url.pathname, { headers: { Accept: "text/html" }, cache: "no-store" }));
        if (res.ok && !res.redirected && url.pathname !== "/login" && (res.headers.get("content-type") || "").includes("text/html")) {
          await (await caches.open(PAGE_CACHE)).put(url.pathname, res.clone());
          await cachePageAssets(res);
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

  // A web worker takes its configuration from the "#params=" part of its URL. A worker script answered from our
  // cache loses that part (the cached response has no fragment), so leave workers to the browser, which serves
  // them from its own long-lived cache. The app falls back to merging on the main thread if a worker cannot start.
  if (req.destination === "worker") return;

  // Hashed build assets never change: cache-first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const hit = await cache.match(req); // exact URL only: a worker script's query string carries its configuration
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
          // Never store a redirect target (a signed-out visit lands on /login) or the sign-in page under another URL.
          if (res.ok && !res.redirected && url.pathname !== "/login" && (res.headers.get("content-type") || "").includes("text/html")) {
            const forAssets = res.clone(); // clone now: the browser will consume `res` as soon as we return it
            cache.put(url.pathname, res.clone());
            event.waitUntil(cachePageAssets(forAssets));
          }
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
