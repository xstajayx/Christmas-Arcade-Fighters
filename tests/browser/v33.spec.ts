import { test, expect } from "@playwright/test";
import type { Match } from "../../src/combat/engine";
import { chooseMode, openTrainingTools } from "./helpers";
const state = () =>
  (window as unknown as { __CAF__: { match: Match } }).__CAF__;
test("Super callout clears after repeated attacks, restart and menu exit", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() =>
    localStorage.setItem(
      "caf-save",
      JSON.stringify({ version: 3, tutorial: true, settings: { muted: true } }),
    ),
  );
  await page.goto("/");
  await chooseMode(page, "TRAINING");
  await page.getByRole("button", { name: "CHOOSE STAGE" }).click();
  await page.getByRole("button", { name: "START FIGHT" }).click();
  await expect
    .poll(async () => (await page.evaluate(state)).match.phase)
    .toBe("fight");
  for (let n = 0; n < 2; n++) {
    await openTrainingTools(page);
    await page.getByRole("button", { name: "FULL METERS" }).click();
    await page
      .locator("#training-meter")
      .evaluate((el) => (el as HTMLElement).blur());
    await page.keyboard.press("Space");
    await expect(page.locator("#move-callout")).not.toHaveText("");
    await expect(page.locator("#move-callout")).toHaveText("");
    expect((await page.evaluate(state)).match.fighters[0].superMeter).toBe(0);
  }
  await openTrainingTools(page);
  await page.getByRole("button", { name: "FULL METERS" }).click();
  await page
    .locator("#training-meter")
    .evaluate((el) => (el as HTMLElement).blur());
  await page.keyboard.press("Space");
  await expect(page.locator("#move-callout")).not.toHaveText("");
  await page.locator("#pause-button").click();
  await page.locator('[data-action="restart"]').click();
  await expect(page.locator("#move-callout")).toHaveText("");
  await page.locator("#pause-button").click();
  await page.locator('[data-action="quit"]').click();
  await expect(page.locator("#move-callout")).toHaveText("");
  expect(errors).toEqual([]);
});
test("Easy campaign applies the Easy profile to both bosses rather than retaining route Master AI", async ({
  page,
}) => {
  for (const [index, id, hp] of [
    [7, "rob", 1488],
    [9, "santa", 1615],
  ] as const) {
    await page.addInitScript(
      ({ index }) =>
        localStorage.setItem(
          "caf-save",
          JSON.stringify({
            version: 3,
            tutorial: true,
            campaign: { fighter: "jamie", index, score: 9000, continues: 3 },
            settings: { muted: true, difficulty: "easy" },
          }),
        ),
      { index },
    );
    await page.goto("/");
    await chooseMode(page, "ARCADE");
    await page.getByRole("button", { name: "CHOOSE STAGE" }).click();
    await page.getByRole("button", { name: "START FIGHT" }).click();
    const boss = (await page.evaluate(state)).match.fighters[1];
    expect(boss).toMatchObject({
      id,
      health: hp,
      maxHealth: hp,
      difficulty: "easy",
      bossPhase: 0,
    });
  }
});
