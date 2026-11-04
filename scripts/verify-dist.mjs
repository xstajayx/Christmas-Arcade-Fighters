import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
const root = resolve("dist");
const html = readFileSync(resolve(root, "index.html"), "utf8");
const base = "/Christmas-Arcade-Fighters/";
assert(
  !/\/src\/|main\.ts|@vite\/client/.test(html),
  "Production HTML references development sources",
);
const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(
  (m) => m[1],
);
assert(
  assets.some((path) => path.endsWith(".js")) &&
    assets.some((path) => path.endsWith(".css")),
  "Missing compiled JS or CSS",
);
for (const path of assets) {
  assert(path.startsWith(base + "assets/"), `Wrong Pages base: ${path}`);
  assert(
    existsSync(resolve(root, path.slice(base.length))),
    `Missing asset ${path}`,
  );
}
const id = html.match(/name="caf-build" content="([^"]+)"/)?.[1];
assert(id, "HTML release marker missing");
const worker = readFileSync(resolve(root, "sw.js"), "utf8");
assert(
  worker.includes(`const BUILD = "${id}"`),
  "Worker and HTML releases differ",
);
assert(!worker.includes("__CAF_"), "Uncompiled worker placeholders");
for (const file of [
  ".nojekyll",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  ...["jamie", "nash", "bucket", "beardy"].map((id) => `sprites/${id}.png`),
]) {
  assert(existsSync(resolve(root, file)), `Missing public asset ${file}`);
}
console.log(
  `Verified release ${id}: compiled HTML, JS/CSS, worker, sprites and repository base.`,
);
