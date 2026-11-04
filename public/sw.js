// Vite replaces these placeholders with the exact artifact's release and files.
const BUILD = "__CAF_BUILD_ID__";
const PRECACHE = ["__CAF_PRECACHE__"];
const ROOT = new URL("./", self.location).href;
const PREFIX = "caf:" + new URL(ROOT).pathname + ":";
const CACHE = PREFIX + BUILD;

self.addEventListener("install", (event) =>
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        // Complete the whole release before replacing a working offline version.
        await Promise.all(
          PRECACHE.map(async (path) => {
            const url = new URL(path, ROOT);
            const response = await fetch(new Request(url, { cache: "reload" }));
            if (!response.ok)
              throw new Error(
                `Precache failed: ${url.pathname} (${response.status})`,
              );
            if (path === "./") {
              const html = await response.clone().text();
              if (!html.includes(`name="caf-build" content="${BUILD}"`))
                throw new Error(
                  "Deployment changed during worker installation; retain the previous release",
                );
            }
            if (
              path.endsWith(".js") &&
              !response.headers.get("content-type")?.includes("javascript")
            )
              throw new Error(`Expected compiled JavaScript: ${url.pathname}`);
            if (
              path.endsWith(".css") &&
              !response.headers.get("content-type")?.includes("text/css")
            )
              throw new Error(`Expected compiled CSS: ${url.pathname}`);
            await cache.put(url, response);
          }),
        );
        await self.skipWaiting();
      } catch (error) {
        await caches.delete(CACHE);
        throw error;
      }
    })(),
  ),
);

self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      // Scope cleanup to this game. Also migrate its previous caf-* cache format.
      for (const name of await caches.keys()) {
        if (name === CACHE) continue;
        const owned =
          name.startsWith(PREFIX) ||
          (name.startsWith("caf-") &&
            !!(await (await caches.open(name)).match(ROOT)));
        if (owned) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  ),
);

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.href.startsWith(ROOT)
  )
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      // Keep HTML and its hashed dependencies from one complete release together.
      // Registration checks sw.js without HTTP cache and reloads after activation.
      const key = event.request.mode === "navigate" ? ROOT : event.request;
      const cached = await cache.match(key, { ignoreVary: true });
      if (cached) return cached;
      // Never add arbitrary HTML or a newer build's resources to this release.
      return fetch(event.request);
    })(),
  );
});
