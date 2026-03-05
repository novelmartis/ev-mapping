const STATIC_CACHE = "ev-mapping-static-v7";
const RUNTIME_CACHE = "ev-mapping-runtime-v7";
const PRECACHE = [
  "./",
  "./index.html",
  "./app.js",
  "./styles.css",
  "./icon.svg",
  "./ad-placeholder.svg",
  "./manifest.json",
  "./data/car-presets.generated.json",
  "./data/catalog/catalog_manifest.json",
  "./ads-config.js",
  "./ads.js",
  "./ads.txt",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isNetworkFirstPath(pathname) {
  if (pathname === "/" || pathname.endsWith(".html")) return true;
  if (pathname === "/app.js") return true;
  if (pathname === "/data/car-presets.generated.json") return true;
  if (pathname === "/data/car-presets.generated.next.json") return true;
  if (pathname.startsWith("/data/catalog/")) return true;
  if (pathname.startsWith("/data/catalog-next/")) return true;
  return false;
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await cache.match(request)) || caches.match(request);
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const networkFetch = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    return cached;
  }
  const networkResponse = await networkFetch;
  return networkResponse || Response.error();
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (isNetworkFirstPath(url.pathname)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(staleWhileRevalidate(event.request));
});
