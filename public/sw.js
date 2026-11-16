// Paisa service worker: caches STATIC assets only.
//
// Never caches HTML, RSC payloads or API responses: they contain a signed-in
// user's money data, and on a shared phone a cached dashboard would outlive
// logout. Navigations and data always go to the network.
//
// v2: activating this deletes the v1 cache, which did store authenticated pages.
const CACHE = "paisa-static-v2";

// Content-hashed build output and public icons are safe to cache forever.
function isStaticAsset(url) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/_next/static/")) return true;
  return /^\/(icon[^/]*\.(png|svg)|apple-touch-icon\.png|manifest\.json|favicon\.ico)$/.test(url.pathname);
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Everything except static assets: let the browser handle it (network only).
  if (!isStaticAsset(url)) return;

  // Static: cache-first, fill on miss.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(request);
      if (hit) return hit;
      const response = await fetch(request);
      if (response.ok && response.type === "basic") cache.put(request, response.clone());
      return response;
    })()
  );
});
