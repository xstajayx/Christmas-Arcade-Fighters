import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
const root = "https://example.test/Christmas-Arcade-Fighters/";
type Store = Map<string, Map<string, Response>>;
function worker(
  build: string,
  stores: Store = new Map(),
  badAsset = false,
  wrongShell = false,
) {
  const listeners: Record<string, (event: unknown) => void> = {};
  const source = readFileSync("public/sw.js", "utf8")
    .replace('"__CAF_BUILD_ID__"', JSON.stringify(build))
    .replace(
      '["__CAF_PRECACHE__"]',
      JSON.stringify(["./", `./assets/${build}.js`, `./assets/${build}.css`]),
    );
  const key = (r: Request | string | URL) =>
    typeof r === "string" ? r : r instanceof URL ? r.href : r.url;
  const caches = {
    async open(name: string) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name)!;
      return {
        async put(r: Request | string | URL, response: Response) {
          store.set(key(r), response.clone());
        },
        async match(r: Request | string | URL) {
          return store.get(key(r))?.clone();
        },
      };
    },
    async keys() {
      return [...stores.keys()];
    },
    async delete(name: string) {
      return stores.delete(name);
    },
  };
  runInNewContext(source, {
    URL,
    Request,
    Response,
    caches,
    self: {
      location: new URL(root + "sw.js"),
      clients: { claim: async () => {} },
      skipWaiting: async () => {},
      addEventListener: (type: string, handler: (event: unknown) => void) =>
        (listeners[type] = handler),
    },
    fetch: async (request: Request) => {
      const url = new URL(request.url);
      if (url.pathname.endsWith(".js"))
        return new Response(badAsset ? "missing" : "/* compiled */", {
          status: badAsset ? 404 : 200,
          headers: { "content-type": "application/javascript" },
        });
      if (url.pathname.endsWith(".css"))
        return new Response("body{background:red}", {
          headers: { "content-type": "text/css" },
        });
      return new Response(
        `<html><meta name="caf-build" content="${wrongShell ? "other" : build}"></html>`,
        { headers: { "content-type": "text/html" } },
      );
    },
  });
  const lifecycle = (type: string) =>
    new Promise<void>((resolve, reject) =>
      listeners[type]({
        waitUntil: (promise: Promise<void>) => promise.then(resolve, reject),
      }),
    );
  const request = (path: string, navigate = false) =>
    new Promise<Response>((resolve, reject) =>
      listeners.fetch({
        request: {
          method: "GET",
          url: new URL(path, root).href,
          mode: navigate ? "navigate" : "cors",
        },
        respondWith: (promise: Promise<Response>) =>
          promise.then(resolve, reject),
      }),
    );
  return { stores, lifecycle, request };
}
describe("release-scoped service worker", () => {
  it("precache contains compiled shell, JavaScript and CSS and serves them offline", async () => {
    const w = worker("one");
    await w.lifecycle("install");
    expect(await (await w.request("./", true)).text()).toContain(
      'content="one"',
    );
    expect(await (await w.request("assets/one.js")).text()).toContain(
      "compiled",
    );
    expect(await (await w.request("assets/one.css")).text()).toContain(
      "background",
    );
  });
  it("activates a complete next release and removes only owned stale caches", async () => {
    const old = worker("old");
    await old.lifecycle("install");
    old.stores.set("unrelated-cache", new Map());
    old.stores.set(
      "caf-legacy",
      new Map([[root, new Response("stale source")]]),
    );
    const next = worker("new", old.stores);
    await next.lifecycle("install");
    await next.lifecycle("activate");
    expect(await (await next.request("./", true)).text()).toContain(
      'content="new"',
    );
    expect([...old.stores.keys()]).toEqual([
      "unrelated-cache",
      "caf:/Christmas-Arcade-Fighters/:new",
    ]);
  });
  it("a failed new release cannot evict the working offline release", async () => {
    const old = worker("old");
    await old.lifecycle("install");
    const next = worker("bad", old.stores, true);
    await expect(next.lifecycle("install")).rejects.toThrow("Precache failed");
    expect([...old.stores.keys()]).toContain(
      "caf:/Christmas-Arcade-Fighters/:old",
    );
    expect([...old.stores.keys()]).not.toContain(
      "caf:/Christmas-Arcade-Fighters/:bad",
    );
    expect(await (await old.request("./", true)).text()).toContain(
      'content="old"',
    );
  });
  it("rejects HTML from another deployment instead of mixing releases", async () => {
    const w = worker("new", new Map(), false, true);
    await expect(w.lifecycle("install")).rejects.toThrow("Deployment changed");
    expect(w.stores.size).toBe(0);
  });
});
