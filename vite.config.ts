import { defineConfig } from "vitest/config";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve, relative } from "node:path";

const pagesBase = "/Christmas-Arcade-Fighters/";
const buildId = String(Date.now());

export default defineConfig(({ command, isPreview }) => ({
  base: command === "build" || isPreview ? pagesBase : "/",
  define: { __BUILD_ID__: JSON.stringify(buildId) },
  build: { chunkSizeWarningLimit: 1600 },
  plugins: [
    {
      name: "versioned-offline-release",
      apply: "build",
      transformIndexHtml() {
        return [
          {
            tag: "meta",
            attrs: { name: "caf-build", content: buildId },
            injectTo: "head",
          },
        ];
      },
      closeBundle() {
        const output = resolve("dist");
        const files = readdirSync(output, {
          recursive: true,
          withFileTypes: true,
        })
          .filter((entry) => entry.isFile())
          .map((entry) =>
            relative(output, resolve(entry.parentPath, entry.name)).replaceAll(
              "\\",
              "/",
            ),
          )
          // Stage scores and codec variants load on demand on mobile.
          .filter(
            (file) =>
              file !== "sw.js" &&
              file !== "index.html" &&
              !file.startsWith("audio/music/"),
          );
        const worker = readFileSync(resolve("public/sw.js"), "utf8")
          .replace('"__CAF_BUILD_ID__"', JSON.stringify(buildId))
          .replace(
            '["__CAF_PRECACHE__"]',
            JSON.stringify(["./", ...files.map((file) => `./${file}`)]),
          );
        writeFileSync(resolve(output, "sw.js"), worker);
        // Prevent a branch/Jekyll deploy from interpreting output filenames.
        writeFileSync(resolve(output, ".nojekyll"), "");
      },
    },
  ],
  test: { include: ["tests/**/*.test.ts"] },
}));
