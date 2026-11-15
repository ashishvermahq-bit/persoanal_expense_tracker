// Service Worker for offline support and caching strategy
const CACHE_VERSION = "v1";
const CACHE_NAME = `paisa-${CACHE_VERSION}`;

const CACHE_URLS = [
  "/",
  "/dashboard",
  "/add",
  "/expenses",
  "/income",
  "/budgets",
  "/categories",
  "/preferences",
];

// Install event: cache essential resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CACHE_URLS).catch(() => {
        // Fail silently - not all URLs may be available during install
      });
    })
  );
  self.skipWaiting();
});

// Activate event: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event: network-first, then cache
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip API requests for now (they need fresh data)
  if (request.url.includes("/api/")) {
    return;
  }

  // GET requests: network-first, fallback to cache
  if (request.method === "GET") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response && response.status === 200) {
            const cache_response = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, cache_response);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache on network error
          return caches.match(request).then((response) => {
            return response || new Response("Offline - page not cached", { status: 503 });
          });
        })
    );
  }
});
