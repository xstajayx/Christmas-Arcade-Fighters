import { expect, type Page } from "@playwright/test";
export async function menuReady(page: Page) {
  await expect(
    page.getByRole("button", { name: "ARCADE", exact: true }),
  ).toBeVisible();
}
export async function chooseMode(page: Page, mode: string) {
  await menuReady(page);
  if (
    [
      "VERSUS",
      "LOCAL VERSUS",
      "VERSUS CPU",
      "SURVIVAL",
      "HIGH SCORES",
    ].includes(mode)
  )
    await page.locator("[data-action=more]").click();
  await page
    .getByRole("button", {
      name: mode === "VERSUS" ? "LOCAL VERSUS" : mode,
      exact: true,
    })
    .click();
}
