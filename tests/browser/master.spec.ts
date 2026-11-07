import { test, expect } from "@playwright/test";
import { chooseMode, openTrainingTools } from "./helpers";
test("arcade options persist rule changes and expose two independent special controls", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "OPTIONS", exact: true }).click();
  await page.getByRole("button", { name: "GAMEPLAY", exact: true }).click();
  await page.locator("#round-count").selectOption("1");
  await page.locator("#round-timer").selectOption("75");
  await page.locator("#shake").uncheck();
  await page.getByRole("button", { name: "CONTROLS", exact: true }).click();
  await page.getByRole("button", { name: "GAMEPAD", exact: true }).click();
  await page.locator('[data-pad="punch"]').selectOption("1");
  await expect(page.locator('[data-pad="kick"]')).toHaveValue("0");
  await page.getByRole("button", { name: "SAVE & RETURN" }).click();
  await page.reload();
  await chooseMode(page, "TRAINING");
  await page.locator('[data-action="pick-beardy"]').click();
  await page.getByRole("button", { name: "CHOOSE STAGE" }).click();
  await page.getByRole("button", { name: "START FIGHT" }).click();
  await page.getByRole("button", { name: "GOT IT." }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as unknown as {
              __CAF__: { match: { phase: string; projectiles: unknown[] } };
            }
          ).__CAF__.match.phase,
      ),
    )
    .toBe("fight");
  await expect(page.locator(".actions [data-action]")).toHaveCount(6);
  await openTrainingTools(page);
  await page.getByRole("button", { name: "FULL METERS" }).click();
  await page.keyboard.down("KeyS");
  await page.keyboard.press("KeyO");
  await page.keyboard.up("KeyS");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as unknown as {
              __CAF__: { match: { phase: string; projectiles: unknown[] } };
            }
          ).__CAF__.match.projectiles.length,
      ),
    )
    .toBeGreaterThan(0);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("caf-save")!).settings,
    ),
  ).toMatchObject({ rounds: 1, timer: 75, shake: false });
  const bindings = await page.evaluate(
    () => JSON.parse(localStorage.getItem("caf-save")!).settings.padButtons,
  );
  expect(bindings).toMatchObject({
    punch: 1,
    kick: 0,
    special: 3,
    special2: 4,
  });
  if (test.info().project.name !== "desktop") {
    const boxes = await page
      .locator(".actions [data-action]")
      .evaluateAll((elements) =>
        elements.map((el) => {
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, w: r.width, h: r.height };
        }),
      );
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i],
          b = boxes[j];
        expect(
          a.x < b.x + b.w &&
            a.x + a.w > b.x &&
            a.y < b.y + b.h &&
            a.y + a.h > b.y,
        ).toBe(false);
      }
  }
  await page.waitForTimeout(1000);
  await page.evaluate(() =>
    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () => [
        {
          connected: true,
          index: 0,
          id: "Mapped test pad",
          mapping: "standard",
          axes: [0, 0],
          buttons: Array.from({ length: 16 }, (_, i) => ({
            pressed: i === 1,
            value: i === 1 ? 1 : 0,
            touched: i === 1,
          })),
          timestamp: 0,
        },
      ],
    }),
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as unknown as {
              __CAF__: { match: { fighters: { move: string | null }[] } };
            }
          ).__CAF__.match.fighters[0].move,
      ),
    )
    .toBe("punch");
  expect(errors).toEqual([]);
});
