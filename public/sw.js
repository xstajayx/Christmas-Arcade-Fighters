const CACHE = "caf-" + (new URL(self.location).searchParams.get("v") || "v1");
const ROOT = new URL("./", self.location).href;
self.addEventListener("install", (event) =>
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const response = await fetch(ROOT);
      if (!response.ok) throw new Error("Offline shell fetch failed");
      const html = await response.clone().text();
      const paths = [
        ...html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css))"/g),
      ].map((m) => new URL(m[1], ROOT).href);
      await cache.put(ROOT, response);
      await cache.addAll([
        ...paths,
        new URL("icon.svg", ROOT).href,
        new URL("icon-192.png", ROOT).href,
        new URL("icon-512.png", ROOT).href,
        new URL("manifest.webmanifest", ROOT).href,
      ]);
      await self.skipWaiting();
    })(),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith("caf-") && key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== self.location.origin
  )
    return;
  event.respondWith(
    (async () => {
      if (event.request.mode === "navigate") {
        try {
          const fresh = await fetch(event.request);
          if (fresh.ok) {
            const cache = await caches.open(CACHE);
            await cache.put(ROOT, fresh.clone());
          }
          return fresh;
        } catch {
          const shell = await caches.match(ROOT);
          if (shell) return shell;
        }
      }
      // The preview server varies static assets by Origin. Module requests
      // include Origin, while install-time precache requests may omit it.
      // These versioned, same-origin static files have identical content.
      const cached = await caches.match(event.request, {
        ignoreVary: ["script", "style"].includes(event.request.destination),
      });
      if (cached) return cached;
      try {
        const response = await fetch(event.request);
        if (
          response.ok &&
          (event.request.destination === "script" ||
            event.request.destination === "style")
        ) {
          const cache = await caches.open(CACHE);
          await cache.put(event.request, response.clone());
        }
        return response;
      } catch (error) {
        if (event.request.mode === "navigate") {
          const shell = await caches.match(ROOT);
          if (shell) return shell;
        }
        throw error;
      }
    })(),
  );
});
