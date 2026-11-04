// Strict static hosting: missing assets return 404, never a Vite SPA fallback.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { URL } from "node:url";
import process from "node:process";
const root = resolve("dist");
const base = "/Christmas-Arcade-Fighters/";
const mime = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
};
createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    if (!path.startsWith(base)) {
      res.writeHead(404).end();
      return;
    }
    let file = resolve(root, path.slice(base.length) || "index.html");
    if (!file.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
    const data = await readFile(file);
    res.writeHead(200, {
      "content-type": mime[extname(file)] || "application/octet-stream",
      "cache-control": "no-cache",
    });
    res.end(data);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(4180, "127.0.0.1", () =>
  process.stdout.write("Production dist ready under " + base + "\n"),
);
