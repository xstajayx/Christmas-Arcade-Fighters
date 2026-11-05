import { menuReady, chooseMode } from "./helpers";
import { test, expect } from "@playwright/test";
test("production runs from a repository subdirectory and restarts offline", async ({
  page,
  context,
}) => {
  await page.goto("http://127.0.0.1:4180/Christmas-Arcade-Fighters/");
  await menuReady(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await menuReady(page);
  await menuReady(page);
  await chooseMode(page, "TRAINING");
  await expect(page.getByText("CHOOSE YOUR FIGHTER.")).toBeVisible();
  await context.setOffline(false);
});
