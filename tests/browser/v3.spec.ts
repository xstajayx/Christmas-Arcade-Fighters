import { test, expect } from "@playwright/test";
import { chooseMode } from "./helpers";
import type { Match } from "../../src/combat/engine";
type Snapshot = {
  screen: string;
  match: Match;
  rendering: {
    scene: {
      camera: { x: number; y: number; zoom: number };
      sprites: {
        x: number;
        y: number;
        originX: number;
        originY: number;
        texture: string;
      }[];
    };
  };
};
const state = () => (window as unknown as { __CAF__: Snapshot }).__CAF__;
test("V3 menu, locked roster, directional touch controls and live sprite inspector", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator(".v3-primary button")).toHaveCount(5);
  await chooseMode(page, "TRAINING");
  await expect(page.locator("[data-action=pick-rob]")).toBeDisabled();
  await expect(page.locator("[data-action=pick-santa]")).toBeDisabled();
  await page.getByRole("button", { name: "CHOOSE STAGE" }).click();
  await page.getByRole("button", { name: "START FIGHT" }).click();
  await page.getByRole("button", { name: "GOT IT." }).click();
  await expect
    .poll(async () => (await page.evaluate(state)).match.phase)
    .toBe("fight");
  await expect(page.locator(".touch-key.block")).toHaveCount(0);
  await expect
    .poll(async () => (await page.evaluate(state)).rendering.scene.camera.zoom)
    .toBeGreaterThan(1.18);
  expect(
    (await page.evaluate(state)).rendering.scene.sprites.every(
      (s) => s.originX === 0.5 && s.originY === 244 / 256,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "SPRITE INSPECTOR", exact: true })
    .click();
  await page.locator("#inspect-atlas").selectOption("special");
  await page.locator("#inspect-frame").fill("19");
  await expect(page.locator("#inspect-number")).toHaveText("19");
  await page.getByRole("button", { name: "CLOSE INSPECTOR" }).click();
  expect(errors).toEqual([]);
});
test("unsupported fullscreen switches to an immersive layout without throwing", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
      configurable: true,
      value: undefined,
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "FULLSCREEN", exact: true }).click();
  await expect(page.locator("body")).toHaveClass(/immersive/);
  await expect(page.getByRole("status")).toContainText(
    "Immersive layout enabled",
  );
});
test("saved final level is Santa at the North Pole with the boss profile", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "caf-save",
      JSON.stringify({
        version: 3,
        tutorial: true,
        campaign: { fighter: "jamie", index: 9, score: 9000, continues: 2 },
        settings: { muted: true },
      }),
    ),
  );
  await page.goto("/");
  await chooseMode(page, "ARCADE");
  await page.getByRole("button", { name: "CHOOSE STAGE" }).click();
  await expect(page.locator(".next-challenge")).toContainText("SANTA");
  await expect(page.locator(".level-strip .current")).toHaveText("10");
  await page.getByRole("button", { name: "START FIGHT" }).click();
  await expect
    .poll(async () => (await page.evaluate(state)).match.phase)
    .toBe("fight");
  const s = await page.evaluate(state);
  expect(s.match.fighters[1]).toMatchObject({
    id: "santa",
    profile: "boss",
    health: 1900,
  });
});

test("a real grab holds and lifts the defender before throw damage", async ({
  page,
}) => {
  await page.goto("/");
  await chooseMode(page, "LOCAL VERSUS");
  await page.getByRole("button", { name: "CHOOSE STAGE" }).click();
  await page.getByRole("button", { name: "START FIGHT" }).click();
  await page.getByRole("button", { name: "GOT IT." }).click();
  await expect
    .poll(async () => (await page.evaluate(state)).match.phase)
    .toBe("fight");
  await page.keyboard.down("KeyD");
  await page.keyboard.down("ArrowLeft");
  await expect
    .poll(async () => {
      const m = (await page.evaluate(state)).match;
      return Math.abs(m.fighters[1].x - m.fighters[0].x);
    })
    .toBeLessThan(122);
  await page.keyboard.up("KeyD");
  await page.keyboard.up("ArrowLeft");
  const health = (await page.evaluate(state)).match.fighters[1].health;
  await page.keyboard.press("KeyU");
  await expect
    .poll(async () => (await page.evaluate(state)).match.throwSequence)
    .not.toBeNull();
  expect((await page.evaluate(state)).match.fighters[1].health).toBe(health);
  await expect
    .poll(async () => (await page.evaluate(state)).match.fighters[1].y)
    .toBeLessThan(300);
  await expect
    .poll(async () => (await page.evaluate(state)).match.fighters[1].health)
    .toBeLessThan(health);
  await expect
    .poll(async () => (await page.evaluate(state)).match.throwSequence)
    .toBeNull();
  const hudBefore = await page.locator("#timer").boundingBox();
  await page.keyboard.down("KeyA");
  await page.keyboard.down("ArrowRight");
  await expect
    .poll(async () => {
      const m = (await page.evaluate(state)).match;
      return m.fighters[0].x === 45 && m.fighters[1].x === 755;
    })
    .toBe(true);
  await page.keyboard.up("KeyA");
  await page.keyboard.up("ArrowRight");
  const camera = (await page.evaluate(state)).rendering.scene.camera;
  expect(camera.zoom).toBeLessThan(0.95);
  const hudAfter = await page.locator("#timer").boundingBox();
  expect(hudAfter!.x).toBeCloseTo(hudBefore!.x);
  expect(hudAfter!.y).toBeCloseTo(hudBefore!.y);
});

test("fullscreen preserves the world aspect through native support or fallback", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "FULLSCREEN", exact: true }).click();
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          !!document.fullscreenElement ||
          document.body.classList.contains("immersive"),
      ),
    )
    .toBe(true);
  const canvas = await page.locator("#game canvas").boundingBox();
  expect(canvas!.width / canvas!.height).toBeCloseTo(16 / 9, 1);
  if (await page.evaluate(() => !!document.fullscreenElement))
    await page.evaluate(() => document.exitFullscreen());
});
