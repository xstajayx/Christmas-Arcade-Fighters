// Lossless format conversion only: preserve original PNG masters outside public/.
import { spawnSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import process from "node:process";
mkdirSync("public/atlases", { recursive: true });
mkdirSync("public/stages", { recursive: true });
for (const id of [
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
]) {
  const source = `assets/source/${id}.png`;
  if (!existsSync(source))
    throw new Error(`Missing committed art master: ${source}`);
  const result = spawnSync(
    "ffmpeg",
    [
      "-loglevel",
      "error",
      "-y",
      "-i",
      source,
      "-c:v",
      "libwebp",
      "-lossless",
      "1",
      "-compression_level",
      "6",
      `public/atlases/${id}.webp`,
    ],
    { stdio: "inherit" },
  );
  if (result.status !== 0) process.exit(1);
}
if (!existsSync("assets/source/arenas.png"))
  throw new Error("Missing committed arena master: assets/source/arenas.png");
const result = spawnSync(
  "ffmpeg",
  [
    "-loglevel",
    "error",
    "-y",
    "-i",
    "assets/source/arenas.png",
    "-c:v",
    "libwebp",
    "-lossless",
    "1",
    "-compression_level",
    "6",
    "public/stages/arenas.webp",
  ],
  { stdio: "inherit" },
);
if (result.status !== 0) process.exit(1);

const v3 = spawnSync(
  "ffmpeg",
  [
    "-loglevel",
    "error",
    "-y",
    "-i",
    "assets/source/v3-arenas.png",
    "-c:v",
    "libwebp",
    "-lossless",
    "1",
    "-compression_level",
    "6",
    "public/stages/v3-arenas.webp",
  ],
  { stdio: "inherit" },
);
if (v3.status !== 0) process.exit(1);

await import("./prepare-gifts.mjs");

// Original V5 illustrated key art is separate from the legacy combat atlases.
mkdirSync("public/art", { recursive: true });
if (existsSync("assets/source/tournament-hd.png")) {
  const hero = spawnSync(
    "ffmpeg",
    [
      "-loglevel",
      "error",
      "-y",
      "-i",
      "assets/source/tournament-hd.png",
      "-c:v",
      "libwebp",
      "-quality",
      "86",
      "public/art/tournament-hd.webp",
    ],
    { stdio: "inherit" },
  );
  if (hero.status !== 0) process.exit(1);
}
