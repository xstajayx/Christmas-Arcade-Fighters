import { test, expect, type Page } from "@playwright/test";
import type Phaser from "phaser";
import type { Match } from "../../src/combat/engine";
import { fighterById, getMove } from "../../src/fighters/data";
test.beforeEach(async ({ browserName }, info) => {
  test.skip(
    browserName !== "chromium" || info.project.name !== "desktop",
    "This spec creates its own explicit portrait/landscape viewport matrix.",
  );
});
const snapshot = () =>
  (window as unknown as { __CAF__: { match: Match } }).__CAF__.match;
async function start(page: Page) {
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
  await page.getByRole("button", { name: "TRAINING", exact: true }).click();
  await page.getByRole("button", { name: "CHOOSE STAGE" }).click();
  await page.getByRole("button", { name: "START FIGHT" }).click();
  await page.waitForFunction(
    () =>
      (window as unknown as { __CAF__: { match: Match } }).__CAF__.match
        .phase === "fight",
  );
}
async function freeze(page: Page) {
  await page.evaluate(async () => {
    const path = [...document.scripts].find(
      (s) => new URL(s.src).pathname === "/src/main.ts",
    )!.src;
    const { game } = await import(path);
    game.loop.stop();
    (window as unknown as { poseGame: Phaser.Game }).poseGame = game;
  });
}
async function frames(page: Page, count: number) {
  await page.evaluate((count) => {
    const game = (window as unknown as { poseGame: Phaser.Game }).poseGame;
    for (let i = 0; i < count; i++)
      game.step(performance.now() + (i * 1000) / 60, 1000 / 60);
  }, count);
}
for (const [width, height] of [
  [390, 667],
  [390, 844],
  [844, 390],
  [915, 412],
  [1280, 720],
])
  test(`menu and HUD fit ${width}x${height}`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width, height },
      isMobile: width < 1000,
      hasTouch: width < 1000,
    });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:4173/");
    await expect(
      page.getByRole("button", { name: "ARCADE", exact: true }),
    ).toBeVisible();
    const menu = await page.locator(".v3-menu").boundingBox();
    const logo = await page.locator(".v3-logo").boundingBox();
    expect(logo!.y - menu!.y).toBeLessThan(90);
    const buttons = await page
      .locator(".v3-primary button,.v3-utility button")
      .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().toJSON()));
    for (const r of buttons) {
      expect(r.top).toBeGreaterThan(0);
      expect(r.bottom).toBeLessThanOrEqual(height);
      expect(r.right).toBeLessThanOrEqual(width);
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight),
    ).toBeLessThanOrEqual(height + 2);
    await page.screenshot({ path: `/tmp/v34-menu-${width}-${height}.png` });
    if (width === 390 && height === 844) {
      await page
        .getByRole("button", { name: "FULLSCREEN", exact: true })
        .click();
      await expect
        .poll(() => page.evaluate(() => !!document.fullscreenElement))
        .toBe(true);
      const bounds = await page.locator(".v3-menu").boundingBox();
      expect(bounds!.y).toBeGreaterThanOrEqual(0);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height);
      await page.evaluate(() => document.exitFullscreen());
    }
    if (width > height) {
      await page.addInitScript(() =>
        localStorage.setItem(
          "caf-save",
          JSON.stringify({
            version: 3,
            tutorial: true,
            settings: { muted: true },
          }),
        ),
      );
      await page.reload();
      await page.getByRole("button", { name: "TRAINING", exact: true }).click();
      await page.getByRole("button", { name: "CHOOSE STAGE" }).click();
      await page.getByRole("button", { name: "START FIGHT" }).click();
      await page.waitForFunction(
        () =>
          (window as unknown as { __CAF__: { match: Match } }).__CAF__.match
            .phase === "fight",
      );
      await page.screenshot({ path: `/tmp/v34-hud-${width}.png` });
      const result = await page.evaluate(() => {
        const rect = (q: string) =>
          document.querySelector(q)!.getBoundingClientRect();
        const overlap = (a: DOMRect, b: DOMRect) =>
          a.left < b.right &&
          b.left < a.right &&
          a.top < b.bottom &&
          b.top < a.bottom;
        const special = rect(".meter-row"),
          superRow = rect(".super-meter-row"),
          training = rect(".training-bar");
        const joystick = document.querySelector(".joystick")!,
          actions = document.querySelector(".actions")!;
        return {
          meterOverlap: overlap(special, superRow),
          trainingOverlap: [joystick, actions]
            .filter(
              (e) =>
                e.getClientRects().length &&
                getComputedStyle(e).display !== "none",
            )
            .some((e) => overlap(training, e.getBoundingClientRect())),
          small: getComputedStyle(document.querySelector("#special-p1")!)
            .fontSize,
        };
      });
      expect(result.meterOverlap).toBe(false);
      expect(result.trainingOverlap).toBe(false);
      expect(parseFloat(result.small)).toBeGreaterThanOrEqual(11);
    }
    await context.close();
  });
test("feet remain grounded through movement/recovery; throws work in both directions and corners", async ({
  page,
}) => {
  await start(page);
  await freeze(page);
  const contact = async () =>
    page.evaluate(() => {
      const game = (window as unknown as { poseGame: Phaser.Game }).poseGame;
      const scene = game.scene.getScene("Arena") as unknown as {
        sprites: Phaser.GameObjects.Sprite[];
        shadows: Phaser.GameObjects.Ellipse[][];
        bridge: { match: Match };
      };
      return scene.sprites.map((s, i) => {
        const m = (
          s.texture.customData as {
            frames: {
              bounds: { y: number; h: number };
              pivot: { y: number };
              contacts: unknown[];
            }[];
          }
        ).frames[Number(s.frame.name)];
        return {
          foot: s.y + (m.bounds.y + m.bounds.h - m.pivot.y) * s.scaleY,
          y: scene.bridge.match.fighters[i].y,
          shadows: scene.shadows[i].filter((s) => s.visible).map((s) => s.y),
        };
      });
    });
  await frames(page, 1);
  for (const p of await contact()) {
    expect(Math.abs(p.foot - 350)).toBeLessThanOrEqual(1);
    expect(p.shadows.length).toBeGreaterThan(0);
    expect(p.shadows.every((y) => y === 351)).toBe(true);
  }
  await page.keyboard.down("KeyD");
  await frames(page, 8);
  await page.keyboard.up("KeyD");
  expect((await contact())[0].foot).toBeCloseTo(350.75);
  await page.keyboard.down("KeyW");
  await frames(page, 10);
  await page.keyboard.up("KeyW");
  expect((await contact())[0].y).toBeLessThan(300);
  await frames(page, 80);
  for (const [index, [ax, bx]] of [
    [350, 474],
    [474, 350],
    [169, 45],
    [631, 755],
  ].entries()) {
    await page.evaluate(
      async ([ax, bx]) => {
        const path = "/src/combat/engine.ts";
        const { resetRound } = await import(path);
        const game = (window as unknown as { poseGame: Phaser.Game }).poseGame;
        const scene = game.scene.getScene("Arena") as unknown as {
          bridge: { match: Match };
        };
        resetRound(scene.bridge.match);
        scene.bridge.match.phase = "fight";
        const [a, b] = scene.bridge.match.fighters;
        a.x = ax;
        b.x = bx;
        a.facing = ax < bx ? 1 : -1;
      },
      [ax, bx],
    );
    await page.keyboard.down("KeyU");
    await frames(page, 20);
    await page.keyboard.up("KeyU");
    expect((await page.evaluate(snapshot)).throwSequence).not.toBeNull();
    await page.screenshot({ path: `/tmp/v34-throw-${index}-hold.png` });
    await frames(page, 20);
    expect((await page.evaluate(snapshot)).fighters[1].state).toBe("knockdown");
    const attackerFrame = await page.evaluate(() => {
      const scene = (
        window as unknown as { poseGame: Phaser.Game }
      ).poseGame.scene.getScene("Arena") as unknown as {
        diagnostics: { sprites: { frame: string | number }[] };
      };
      return Number(scene.diagnostics.sprites[0].frame);
    });
    expect([0, 13]).toContain(attackerFrame);
    await page.screenshot({ path: `/tmp/v34-throw-${index}-air.png` });
    await frames(page, 100);
    expect((await page.evaluate(snapshot)).fighters[1].state).toBe("idle");
    expect(Math.abs((await contact())[1].foot - 350)).toBeLessThanOrEqual(1);
  }
});
test("HUD uses each active fighter and profile, including mirrors, restarts and character changes", async ({
  page,
}) => {
  await start(page);
  await freeze(page);
  for (const [left, right] of [
    ["jamie", "bucket"],
    ["santa", "santa"],
    ["rob", "nash"],
  ] as const) {
    await page.evaluate(
      async ([left, right]) => {
        const path = "/src/combat/engine.ts";
        const { makeFighter } = await import(path);
        const scene = (
          window as unknown as { poseGame: Phaser.Game }
        ).poseGame.scene.getScene("Arena") as unknown as {
          bridge: { match: Match };
        };
        scene.bridge.match.fighters = [
          makeFighter(left, 245, 1),
          makeFighter(right, 555, -1, "boss"),
        ];
        scene.bridge.match.fighters[0].meter = 37;
        scene.bridge.match.fighters[1].meter = 71;
        scene.bridge.match.fighters[0].superMeter = 23;
        scene.bridge.match.fighters[1].superMeter = 87;
      },
      [left, right],
    );
    await frames(page, 1);
    for (const [i, id] of [left, right].entries()) {
      const profile = i === 0 ? "standard" : "boss";
      await expect(page.locator(`#fighter-name-p${i + 1}`)).toHaveText(
        fighterById(id).name,
      );
      for (const key of ["special", "special2"] as const)
        await expect(page.locator(`#moves-p${i + 1}`)).toContainText(
          getMove(id, key, profile).name!,
        );
      await expect(page.locator(`#special-p${i + 1}`)).toContainText(
        i === 0 ? "37%" : "71%",
      );
      await expect(page.locator(`#super-p${i + 1}`)).toHaveAttribute(
        "aria-label",
        new RegExp(
          getMove(id, "super", profile).name!.toUpperCase() +
            ", Super " +
            (i === 0 ? "23" : "87") +
            "%",
        ),
      );
    }
  }
  await page.locator("#pause-button").click();
  await page.locator('[data-action="restart"]').click();
  await frames(page, 110);
  await expect(page.locator("#fighter-name-p1")).toHaveText("JAMIE");
  await expect(page.locator("#fighter-name-p2")).toHaveText("BUCKET");
});
