import { test, expect, type Page } from "@playwright/test";
import type Phaser from "phaser";
import type { Match } from "../../src/combat/engine";
import { getMove } from "../../src/fighters/data";
type Harness = {
  __CAF__: {
    screen: string;
    match: Match;
    rendering: { scene: { camera: { zoom: number } } };
  };
  v5game: Phaser.Game;
};
const snapshot = () => (window as unknown as Harness).__CAF__;
test.beforeEach(async ({ browserName }, info) => {
  test.skip(
    browserName !== "chromium" || info.project.name !== "desktop",
    "Uses explicit viewport/device contexts",
  );
});
async function enter(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem(
      "caf-save",
      JSON.stringify({
        version: 3,
        tutorial: true,
        settings: { muted: true },
        unlocked: ["jamie", "nash", "bucket", "beardy", "rob", "santa"],
      }),
    ),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "TRAINING", exact: true }).waitFor();
}
async function fight(page: Page) {
  await page.getByRole("button", { name: "TRAINING", exact: true }).click();
  await page.locator("#opponent").selectOption("beardy");
  await page.getByRole("button", { name: "CHOOSE STAGE" }).click();
  await page.getByRole("button", { name: "START FIGHT" }).click();
  await page.waitForFunction(
    () => (window as unknown as Harness).__CAF__.match.phase === "fight",
  );
}
async function freeze(page: Page) {
  await page.evaluate(async () => {
    const path = [...document.scripts].find(
      (s) => new URL(s.src).pathname === "/src/main.ts",
    )!.src;
    const { game } = await import(path);
    game.loop.stop();
    (window as unknown as Harness).v5game = game;
  });
}
async function frames(page: Page, n: number) {
  await page.evaluate((n) => {
    const game = (window as unknown as Harness).v5game;
    for (let i = 0; i < n; i++)
      game.step(performance.now() + (i * 1000) / 60, 1000 / 60);
  }, n);
}
for (const [width, height] of [
  [844, 390],
  [915, 412],
  [1280, 720],
  [1920, 1080],
  [390, 844],
])
  test(`arcade screens and separated HUD fit ${width}x${height}`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
        viewport: { width, height },
        isMobile: width < 1000,
        hasTouch: width < 1000,
      }),
      page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await enter(page);
    for (const label of [
      "ARCADE",
      "VERSUS",
      "TRAINING",
      "CHARACTERS",
      "MORE MODES",
      "OPTIONS",
      "FULLSCREEN",
    ]) {
      const r = await page
        .getByRole("button", { name: label, exact: true })
        .boundingBox();
      expect(r!.y).toBeGreaterThanOrEqual(0);
      expect(r!.y + r!.height).toBeLessThanOrEqual(height + 1);
    }
    if (width === 1280 || width === 844)
      await page.screenshot({ path: `/tmp/v5-final-menu-${width}.png` });
    await page.getByRole("button", { name: "OPTIONS", exact: true }).click();
    for (const label of ["AUDIO", "CONTROLS", "GAMEPLAY"]) {
      await page.getByRole("button", { name: label, exact: true }).click();
      const clipped = await page
        .locator(".settings-grid")
        .evaluate((e) => e.scrollHeight > e.clientHeight + 2);
      expect(clipped, `${label} options clip`).toBe(false);
    }
    await page.getByRole("button", { name: "SAVE & RETURN" }).click();
    await page.getByRole("button", { name: "TRAINING", exact: true }).click();
    await page.locator("[data-action=pick-beardy]").click();
    await expect(page.locator("[data-action=pick-beardy]")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.locator("#opponent").selectOption("jamie");
    await page.getByRole("button", { name: "CHOOSE STAGE" }).click();
    await expect(page.locator(".selected-arena img")).toBeVisible();
    await page.locator("[data-action=stage-3]").click();
    await expect(page.locator(".selected-arena h3")).toHaveText(
      "FROZEN FOREST",
    );
    await page.getByRole("button", { name: "START FIGHT" }).click();
    await page.waitForFunction(
      () => (window as unknown as Harness).__CAF__.match.phase === "fight",
    );
    await expect(page.locator("#fighter-name-p1")).toHaveText("BEARDY");
    await expect(page.locator("#fighter-name-p2")).toHaveText("JAMIE");
    if (width > height) {
      await page.getByText("TRAINING TOOLS", { exact: true }).click();
      await page
        .getByRole("button", { name: "FULL METERS", exact: true })
        .click();
      await page.getByText("TRAINING TOOLS", { exact: true }).click();
      await expect(page.locator("#super-p1")).toContainText("SUPER READY");
      expect(
        await page
          .locator("#super-p1")
          .evaluate((e) => e.scrollWidth > e.clientWidth + 1),
      ).toBe(false);
    }
    if (width > height) {
      const layout = await page.evaluate(() => {
        const rect = (q: string) =>
          document.querySelector(q)!.getBoundingClientRect();
        const overlap = (a: DOMRect, b: DOMRect) =>
          a.left < b.right &&
          b.left < a.right &&
          a.top < b.bottom &&
          b.top < a.bottom;
        const health = rect(".fight-hud"),
          special = rect(".meter-row"),
          superRail = rect(".super-meter-row");
        const controls = [
          ...document.querySelectorAll<HTMLElement>(".joystick,.actions"),
        ].filter(
          (e) =>
            e.getClientRects().length && getComputedStyle(e).display !== "none",
        );
        return {
          healthPower: overlap(health, special) || overlap(health, superRail),
          powerOverlap:
            overlap(special, superRail) &&
            !document.body.matches("[data-touch=true]"),
          controls: controls.some((c) =>
            [special, superRail].some((r) =>
              overlap(c.getBoundingClientRect(), r),
            ),
          ),
          scroll: document.documentElement.scrollHeight > innerHeight + 2,
          healthWidth: rect(".health-frame").width,
          labelOverBar: [...document.querySelectorAll(".meter-row>div")].some(
            (el) =>
              el.querySelector("span[id]")!.getBoundingClientRect().bottom >
              el.querySelector(".meter-frame")!.getBoundingClientRect().top + 1,
          ),
          trainingOverlap: [
            ...document.querySelectorAll(
              ".meter-row>div,.super-meter-row>span",
            ),
          ].some((el) =>
            overlap(el.getBoundingClientRect(), rect(".training-bar")),
          ),
        };
      });
      expect(layout.healthPower).toBe(false);
      expect(layout.powerOverlap).toBe(false);
      expect(layout.controls).toBe(false);
      expect(layout.trainingOverlap).toBe(false);
      expect(layout.labelOverBar).toBe(false);
      expect(layout.scroll).toBe(false);
      expect(layout.healthWidth).toBeGreaterThan(180);
      if (width === 844 || width === 1280)
        await page.screenshot({ path: `/tmp/v5-final-game-${width}.png` });
    }
    expect(errors).toEqual([]);
    await context.close();
  });
test("Jamie and Beardy punches and kicks visibly reach at contact in either direction, including a corner", async ({
  page,
}) => {
  await enter(page);
  await fight(page);
  await freeze(page);
  for (const id of ["jamie", "beardy"] as const)
    for (const move of ["punch", "kick"] as const)
      for (const dir of [1, -1]) {
        await page.evaluate(
          async ({ id, dir }) => {
            const { resetRound, makeFighter } = await import(
              String("/src/combat/engine.ts")
            );
            const game = (window as unknown as Harness).v5game;
            const m = (
              game.scene.getScene("Arena") as unknown as {
                bridge: { match: Match };
              }
            ).bridge.match;
            resetRound(m);
            m.phase = "fight";
            m.fighters[0] = makeFighter(
              id,
              dir === 1 ? 350 : 655,
              dir as 1 | -1,
            );
            m.fighters[1] = makeFighter(
              id === "jamie" ? "beardy" : "jamie",
              dir === 1 ? 450 : 555,
              dir === 1 ? -1 : 1,
            );
          },
          { id, dir },
        );
        const key = move === "punch" ? "KeyJ" : "KeyK";
        await page.keyboard.down(key);
        await frames(page, getMove(id, move).startup + 1);
        await page.keyboard.up(key);
        const state = await page.evaluate(snapshot);
        expect(state.match.events.some((e) => e.type === "hit")).toBe(true);
        expect(state.match.fighters[1].health).toBeLessThan(
          state.match.fighters[1].maxHealth,
        );
        const contact = await page.evaluate(async () => {
          const { activeHitbox, hurtbox } = await import(
            String("/src/combat/engine.ts")
          );
          const m = (window as unknown as Harness).__CAF__.match;
          return {
            hit: activeHitbox(m.fighters[0]),
            hurt: hurtbox(m.fighters[1]),
            event: m.events.find((e) => e.type === "hit"),
          };
        });
        expect(contact.event!.x).toBeGreaterThanOrEqual(contact.hurt.x);
        expect(contact.event!.x).toBeLessThanOrEqual(
          contact.hurt.x + contact.hurt.w,
        );
        if (id === "jamie" && dir === 1)
          await page.screenshot({ path: `/tmp/v5-contact-${move}.png` });
      }
});
test("all existing modes and campaign entry remain available", async ({
  page,
}) => {
  await enter(page);
  for (const action of ["arcade", "characters", "more", "versusmenu"]) {
    await page.locator(`[data-action=${action}]`).click();
    await expect(page.locator("#overlay")).toBeVisible();
    if (action === "arcade") {
      await page.getByRole("button", { name: "CHOOSE STAGE" }).click();
      await expect(page.locator(".v3-stages h2")).toContainText("LEVEL 1 / 10");
    }
    await page.locator(".wordmark").evaluate((e: HTMLElement) => e.click());
    await page.getByRole("button", { name: "ARCADE", exact: true }).waitFor();
  }
  await page.getByRole("button", { name: "MORE MODES", exact: true }).click();
  for (const name of [
    "VERSUS CPU",
    "LOCAL VERSUS",
    "SURVIVAL",
    "HIGH SCORES",
    "CREDITS",
  ])
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  for (const mode of ["VERSUS CPU", "LOCAL VERSUS", "SURVIVAL"]) {
    await page.getByRole("button", { name: mode, exact: true }).click();
    await expect(page.locator(".select-panel")).toBeVisible();
    await page.locator(".wordmark").evaluate((e: HTMLElement) => e.click());
    await page.getByRole("button", { name: "MORE MODES", exact: true }).click();
  }
});
test("HD pipeline loads only the requested clip and respects real crops, pivots and filtering", async ({
  page,
}) => {
  // Deliberately simple test-only image; no fixture artwork ships with the game.
  await page.route("**/characters/hd/catalog.json", (r) =>
    r.fulfill({
      json: {
        version: 1,
        fighters: { jamie: "characters/hd/jamie/manifest.json" },
      },
    }),
  );
  await page.route("**/characters/hd/jamie/manifest.json", (r) =>
    r.fulfill({
      json: {
        version: 1,
        referenceHeight: 560,
        clips: {
          idle: {
            image: "characters/hd/jamie/idle.svg",
            size: [1024, 640],
            loop: true,
            frames: [0, 1].map((n) => ({
              rect: [n * 512, 0, 512, 640],
              pivot: [256, 608],
              bounds: [100, 48, 312, 560],
              contacts: [{ x: 256, width: 80 }],
              ticks: 8,
            })),
          },
        },
      },
    }),
  );
  await page.route("**/characters/hd/jamie/idle.svg", (r) =>
    r.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="640"><path fill="#cfba82" d="M100 48h312v560H100zM612 48h312v560H612z"/></svg>',
    }),
  );
  await enter(page);
  await fight(page);
  await page.waitForFunction(
    () =>
      (window as unknown as Harness).__CAF__.rendering.scene &&
      (
        window as unknown as {
          __CAF__: { rendering: { scene: { sprites: { texture: string }[] } } };
        }
      ).__CAF__.rendering.scene.sprites[0].texture === "hd:jamie:idle",
  );
  await freeze(page);
  const result = await page.evaluate(() => {
    const scene = (window as unknown as Harness).v5game.scene.getScene(
      "Arena",
    ) as unknown as { sprites: Phaser.GameObjects.Sprite[] };
    const s = scene.sprites[0];
    return {
      width: s.frame.realWidth,
      height: s.frame.realHeight,
      origin: s.originY,
      scale: s.scaleY,
      filter: s.texture.source[0].scaleMode,
    };
  });
  expect(result.width).toBe(512);
  expect(result.height).toBe(640);
  expect(result.origin).toBeCloseTo(608 / 640);
  expect(result.scale).toBeCloseTo(170 / 560);
  expect(result.filter).toBe(0);
});
