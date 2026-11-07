import { test, expect } from "@playwright/test";
import type Phaser from "phaser";
import type { Match } from "../../src/combat/engine";
import { writeFileSync } from "node:fs";
import { chooseMode, openTrainingTools } from "./helpers";
test.beforeEach(async ({ browserName }, info) => {
  test.skip(
    browserName !== "chromium" || info.project.name !== "desktop",
    "This spec creates its own explicit landscape viewport matrix.",
  );
});
for (const [width, height] of [
  [844, 390],
  [915, 412],
  [1280, 720],
  [1920, 1080],
])
  test(`arcade navigation and panels fit ${width}x${height}`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width, height },
      isMobile: width < 1000,
      hasTouch: width < 1000,
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:4173/");
    await expect(
      page.getByRole("button", { name: "ARCADE", exact: true }),
    ).toBeVisible();
    const fits = async (selector: string) => {
      const result = await page.locator(selector).evaluateAll((els) => {
        const g = document.querySelector("#game-wrap")!.getBoundingClientRect();
        return els
          .filter((el) => el.getClientRects().length)
          .every((el) => {
            const r = el.getBoundingClientRect();
            return (
              r.x >= Math.max(0, g.x) - 2 &&
              r.y >= Math.max(0, g.y) - 2 &&
              r.right <= Math.min(innerWidth, g.right) + 2 &&
              r.bottom <= Math.min(innerHeight, g.bottom) + 2
            );
          });
      });
      expect(result, selector).toBe(true);
    };
    await fits(".v3-menu,.v3-menu button");
    if (width < 1000)
      expect(
        await page.evaluate(
          () => document.documentElement.scrollHeight <= innerHeight + 2,
        ),
      ).toBe(true);
    await page.screenshot({ path: `/tmp/arcade-menu-${width}.png` });
    if (width === 844) {
      await page
        .getByRole("button", { name: "FULLSCREEN", exact: true })
        .click();
      await expect
        .poll(() => page.evaluate(() => !!document.fullscreenElement))
        .toBe(true);
      await fits(".v3-menu,.v3-menu button");
      await page.evaluate(() => document.exitFullscreen());
    }
    await page.getByRole("button", { name: "ARCADE", exact: true }).focus();
    await page.keyboard.press("ArrowDown");
    await expect(
      page.getByRole("button", { name: "VERSUS", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("button", { name: "LOCAL VERSUS", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "BACK", exact: true }).click();
    await page.getByRole("button", { name: "CHARACTERS", exact: true }).click();
    await fits(".characters .panel,.characters .fighter-card");
    await page.getByRole("button", { name: "BACK", exact: true }).click();
    await chooseMode(page, "TRAINING");
    await expect(page.locator('[data-action="pick-rob"]')).toBeDisabled();
    await page.locator('[data-action="pick-nash"]').click();
    await expect(page.locator('[data-action="pick-nash"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await fits(".select-panel,.fighter-card,.select-panel .panel-footer");
    await page.screenshot({ path: `/tmp/arcade-select-${width}.png` });
    await page.locator('[data-action="menu"]').click();
    await page.getByRole("button", { name: "OPTIONS", exact: true }).click();
    for (const label of ["AUDIO", "CONTROLS", "GAMEPLAY"]) {
      await page.getByRole("button", { name: label, exact: true }).click();
      await fits(
        ".options-tabs,.settings-panel .panel-footer,.option-page input,.option-page select,.option-page button",
      );
      if (label === "GAMEPLAY") {
        await page.locator("#reduced").check();
        await expect(page.locator("body")).toHaveClass(/reduced/);
        await page.locator("#reduced").uncheck();
      }
    }
    await page.getByRole("button", { name: "SAVE & RETURN" }).click();
    await chooseMode(page, "TRAINING");
    await page.getByRole("button", { name: "CHOOSE STAGE" }).click();
    await page.getByRole("button", { name: "START FIGHT" }).click();
    await page.getByRole("button", { name: "GOT IT." }).click();
    await page.locator("#pause-button").click();
    await fits(".compact .stack button");
    await page.locator('[data-action="resume"]').click();
    expect(errors).toEqual([]);
    await context.close();
  });
test("all stage plates are coherent and boss gift animations clean up after collision", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.addInitScript(() =>
    localStorage.setItem(
      "caf-save",
      JSON.stringify({
        version: 3,
        tutorial: true,
        unlocked: ["jamie", "nash", "bucket", "beardy", "rob", "santa"],
        settings: { muted: true },
      }),
    ),
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "ARCADE", exact: true }),
  ).toBeVisible();
  const coverage = await page.evaluate(async () => {
    const path = "/src/main.ts";
    const { game } = (await import(path)) as { game: Phaser.Game };
    const scene = game.scene.getScene("Arena");
    const rows = [];
    for (let stage = 0; stage < 8; stage++) {
      const counts = [];
      for (let layer = 0; layer < 3; layer++) {
        const canvas = scene.textures
          .get(`stage-${stage}-${layer}`)
          .getSourceImage() as HTMLCanvasElement;
        const pixels = canvas
          .getContext("2d")!
          .getImageData(0, 0, 800, 450).data;
        let opaque = 0;
        for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) opaque++;
        counts.push(opaque);
      }
      rows.push(counts);
    }
    return rows;
  });
  expect(coverage).toEqual(Array.from({ length: 8 }, () => [800 * 450, 0, 0]));
  const plates = await page.evaluate(async () => {
    const path = "/src/main.ts";
    const { game } = (await import(path)) as { game: Phaser.Game };
    const scene = game.scene.getScene("Arena");
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 900;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    for (let stage = 0; stage < 8; stage++)
      ctx.drawImage(
        scene.textures
          .get(`stage-${stage}-0`)
          .getSourceImage() as HTMLCanvasElement,
        (stage % 2) * 400,
        Math.floor(stage / 2) * 225,
        400,
        225,
      );
    return canvas.toDataURL().split(",")[1];
  });
  writeFileSync("/tmp/arcade-stages.png", Buffer.from(plates, "base64"));
  for (const id of ["rob", "santa"]) {
    await chooseMode(page, "TRAINING");
    await page.locator(`[data-action="pick-${id}"]`).click();
    await page.getByRole("button", { name: "CHOOSE STAGE" }).click();
    await page.locator(`[data-action="stage-${id === "rob" ? 6 : 7}"]`).click();
    await page.getByRole("button", { name: "START FIGHT" }).click();
    await page.waitForFunction(
      () =>
        (window as unknown as { __CAF__: { match: { phase: string } } }).__CAF__
          .match.phase === "fight",
    );
    await openTrainingTools(page);
    await page.getByRole("button", { name: "FULL METERS" }).click();
    await page.keyboard.press("KeyO");
    const state = () =>
      (
        window as unknown as {
          __CAF__: {
            rendering: {
              scene: {
                giftVisuals: {
                  active: number;
                  impacts: number;
                  frames: { frame: number; left: boolean }[];
                };
              };
            };
          };
        }
      ).__CAF__.rendering.scene.giftVisuals;
    await expect
      .poll(async () => (await page.evaluate(state)).active)
      .toBeGreaterThan(0);
    const first = (await page.evaluate(state)).frames[0];
    expect(first.frame).toBeGreaterThanOrEqual(id === "rob" ? 0 : 16);
    await expect
      .poll(async () => (await page.evaluate(state)).impacts, {
        intervals: [16, 32, 50],
      })
      .toBeGreaterThan(0);
    await expect.poll(async () => (await page.evaluate(state)).impacts).toBe(0);
    expect((await page.evaluate(state)).active).toBe(0);
    // Reverse the presentation positions in the training fixture; use real SP2 input.
    await page.evaluate(async () => {
      const path = "/src/main.ts";
      const { game } = (await import(path)) as { game: Phaser.Game };
      const scene = game.scene.getScene("Arena") as unknown as {
        bridge: { match: Match };
      };
      scene.bridge.match.fighters[0].x = 600;
      scene.bridge.match.fighters[1].x = 300;
    });
    await page.keyboard.press("KeyO");
    await expect
      .poll(async () => (await page.evaluate(state)).frames.some((f) => f.left))
      .toBe(true);
    await expect
      .poll(async () => (await page.evaluate(state)).impacts, {
        intervals: [16, 32, 50],
      })
      .toBeGreaterThan(0);
    await expect.poll(async () => (await page.evaluate(state)).impacts).toBe(0);
    await page.locator("#pause-button").click();
    await page.locator('[data-action="quit"]').click();
  }
});

test("mobile campaign result, unlock and continue screens fit (presentation fixtures)", async ({
  browser,
}) => {
  // Fixtures exercise presentation/progression wiring, not earned victories or balance.
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.addInitScript(() =>
    localStorage.setItem(
      "caf-save",
      JSON.stringify({
        version: 3,
        tutorial: true,
        campaign: { fighter: "jamie", index: 7, score: 9000, continues: 3 },
        settings: { muted: true, difficulty: "easy" },
      }),
    ),
  );
  await page.goto("/");
  await chooseMode(page, "ARCADE");
  await page.getByRole("button", { name: "CHOOSE STAGE" }).click();
  await page.getByRole("button", { name: "START FIGHT" }).click();
  await page.waitForFunction(
    () =>
      (window as unknown as { __CAF__: { match: Match } }).__CAF__.match
        .phase === "fight",
  );
  const resultFixture = async (winner: 0 | 1) =>
    page.evaluate(async (winner) => {
      const path = "/src/main.ts";
      const { game } = (await import(path)) as { game: Phaser.Game };
      const scene = game.scene.getScene("Arena") as unknown as {
        bridge: { match: Match };
      };
      scene.bridge.match.phase = "matchOver";
      scene.bridge.match.winner = winner;
      scene.bridge.match.fighters[winner].wins = 2;
    }, winner);
  const fits = async () =>
    expect(
      await page.locator(".result-panel").evaluate((el) => {
        const r = el.getBoundingClientRect();
        return (
          r.top >= 0 &&
          r.bottom <= innerHeight &&
          el.scrollHeight <= el.clientHeight + 2
        );
      }),
    ).toBe(true);
  await resultFixture(0);
  await expect(page.locator(".unlock-notice")).toContainText("UNLOCKED");
  await page.screenshot({ path: "/tmp/arcade-unlock.png" });
  await fits();
  await page.getByRole("button", { name: "NEXT CHALLENGER" }).click();
  await expect(page.locator(".p2 .name-line")).toContainText("FROST");
  await page.waitForFunction(
    () =>
      (window as unknown as { __CAF__: { match: Match } }).__CAF__.match
        .phase === "fight",
  );
  await resultFixture(1);
  await expect(page.locator("#continue-clock")).toBeVisible();
  await page.screenshot({ path: "/tmp/arcade-continue.png" });
  await fits();
  await page.locator('[data-action="continue"]').click();
  await expect(page.locator(".p2 .name-line")).toContainText("FROST");
  await context.close();
});
