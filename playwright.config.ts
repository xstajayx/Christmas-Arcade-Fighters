import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
export default defineConfig({
  testDir: "tests/browser",
  timeout: 90000,
  expect: { timeout: 12000 },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    headless: true,
    launchOptions: existsSync("/usr/bin/chromium")
      ? { executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] }
      : {},
  },
  webServer: [
    {
      command: "npm run dev -- --port 4173",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: !process.env.CI,
    },
    {
      command:
        "npm run build && npm run preview -- --port 4180 --base /Christmas-Arcade-Fighters/",
      url: "http://127.0.0.1:4180/Christmas-Arcade-Fighters/",
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: "android-landscape",
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 915, height: 412 },
        isMobile: true,
      },
    },
    {
      name: "iphone-landscape",
      use: {
        ...devices["iPhone 13"],
        defaultBrowserType: "chromium",
        viewport: { width: 844, height: 390 },
        isMobile: true,
      },
    },
  ],
});
