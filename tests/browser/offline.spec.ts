import { test, expect } from "@playwright/test";
test("production runs from a repository subdirectory and restarts offline", async ({
  page,
  context,
}) => {
  await page.goto("http://127.0.0.1:4180/Christmas-Arcade-Fighters/");
  await expect(page.getByRole("button", { name: "LET’S FIGHT" })).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("button", { name: "LET’S FIGHT" })).toBeVisible();
  await page.getByRole("button", { name: "LET’S FIGHT" }).click();
  await page
    .getByRole("button")
    .filter({ has: page.locator("strong", { hasText: "TRAINING" }) })
    .click();
  await expect(page.getByText("CHOOSE YOUR FIGHTER.")).toBeVisible();
  await context.setOffline(false);
});
