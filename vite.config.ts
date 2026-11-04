import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  define: { __BUILD_ID__: JSON.stringify(String(Date.now())) },
  build: { chunkSizeWarningLimit: 1600 },
  test: { include: ["tests/**/*.test.ts"] },
});
