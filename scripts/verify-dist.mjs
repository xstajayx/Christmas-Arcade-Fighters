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
  "stages/arenas.webp",
  "stages/v3-arenas.webp",
  "atlases/festive-gifts.webp",
  ...[
    "jamie",
    "nash",
    "bucket",
    "beardy",
    "frost",
    "rob",
    "santa",
    "actions",
    "walk",
    ...["jamie", "nash", "bucket", "beardy", "frost", "rob", "santa"].map(
      (id) => `special-${id}`,
    ),
  ].map((id) => `atlases/${id}.webp`),
  "voices/manifest.json",
])
  assert(existsSync(resolve(root, file)), `Missing public asset ${file}`);
const voiceManifest = JSON.parse(
  readFileSync(resolve(root, "voices/manifest.json"), "utf8"),
);
assert(
  voiceManifest.clips.length === voiceManifest.required.length,
  "Announcer clips incomplete",
);
for (const clip of voiceManifest.clips) {
  const wave = readFileSync(resolve(root, "voices", clip.file));
  assert(
    wave.toString("ascii", 0, 4) === "RIFF" &&
      wave.toString("ascii", 8, 12) === "WAVE",
    `Invalid announcer WAV ${clip.id}`,
  );
  assert(wave.length > 2000, `Empty announcer clip ${clip.id}`);
}
console.log(
  `Verified release ${id}: compiled HTML, JS/CSS, versioned worker, eight arenas, base/action/walk/signature atlases and ${voiceManifest.clips.length} announcer clips.`,
);
