import { chooseMode } from "./helpers";
import { test, expect, type Page } from "@playwright/test";
import type { Match } from "../../src/combat/engine";
type State = {
  screen: string;
  mode: string;
  stage: number;
  tutorialStep: number;
  campaign: {
    index: number;
    completed: boolean;
    score: number;
    continues: number;
  } | null;
  match: Match | null;
};
const state = (page: Page) =>
  page.evaluate(() => (window as unknown as { __CAF__: State }).__CAF__);
async function choose(page: Page, mode: string, fighter = "NASH") {
  await page.goto("/");
  await chooseMode(page, mode);
  await page
    .getByRole("button", { name: new RegExp(fighter + ".*THE ") })
    .click();
  await page.getByRole("button", { name: "CHOOSE STAGE" }).click();
  await page.getByRole("button", { name: "START FIGHT" }).click();
  if (await page.getByRole("button", { name: "GOT IT." }).isVisible())
    await page.getByRole("button", { name: "GOT IT." }).click();
}
async function drivenBout(page: Page, seed: number) {
  // Advance the real scene loop without waiting for wall-clock rendering. The
  // player still uses actual key events; no health, timer, winner or save mutation.
  return page.evaluate(async (seed) => {
    const engineUrl = "/src/main.ts",
      cpuUrl = "/src/ai/cpu.ts";
    const { game } = await import(engineUrl),
      { CPU } = await import(cpuUrl);
    game.loop.stop();
    const scene = game.scene.getScene("Arena"),
      player = new CPU("master", seed);
    const win = window as unknown as { __CAF__: State };
    const pressed = new Set<string>();
    const codes: Record<string, string> = {
      left: "KeyA",
      right: "KeyD",
      up: "KeyW",
      down: "KeyS",
      punch: "KeyJ",
      kick: "KeyK",
      special: "KeyI",
      special2: "KeyO",
      special3: "KeyP",
      super: "Space",
      grab: "KeyU",
      heavy: "ShiftLeft",
      dash: "ShiftRight",
    };
    let frames = 0,
      maxPhase = 0,
      maxCombo = 0;
    while (win.__CAF__.screen === "match" && frames < 25000) {
      const m = win.__CAF__.match!;
      const input = player.input(m, 0);
      const next = new Set<string>();
      for (const [action, code] of Object.entries(codes))
        if (input[action]) next.add(code);
      for (const code of pressed)
        if (!next.has(code))
          document.body.dispatchEvent(
            new KeyboardEvent("keyup", { code, bubbles: true }),
          );
      for (const code of next)
        if (!pressed.has(code))
          document.body.dispatchEvent(
            new KeyboardEvent("keydown", {
              code,
              bubbles: true,
              cancelable: true,
            }),
          );
      pressed.clear();
      for (const code of next) pressed.add(code);
      scene.update((frames * 1000) / 60, 1000 / 60);
      frames++;
      const result = win.__CAF__.match!;
      maxPhase = Math.max(maxPhase, result.fighters[1].bossPhase);
      maxCombo = Math.max(maxCombo, result.fighters[0].combo);
    }
    for (const code of pressed)
      document.body.dispatchEvent(
        new KeyboardEvent("keyup", { code, bubbles: true }),
      );
    return {
      frames,
      winner: win.__CAF__.match?.winner,
      maxPhase,
      maxCombo,
      health: win.__CAF__.match?.fighters[0].health,
      screen: win.__CAF__.screen,
      opponent: win.__CAF__.match?.fighters[1].id,
    };
  }, seed);
}
test("three specials, hitbox lab and cinematic Super work through controls", async ({
  page,
}) => {
  await choose(page, "TRAINING", "JAMIE");
  await expect.poll(async () => (await state(page)).match?.phase).toBe("fight");
  await page.locator("#show-hitboxes").check();
  await page.getByRole("button", { name: "FULL METERS" }).click();
  await page.keyboard.press("KeyI");
  await expect
    .poll(async () => (await state(page)).match?.fighters[1].health)
    .toBeLessThan(96);
  await page.keyboard.down("KeyD");
  await expect
    .poll(async () => (await state(page)).match!.fighters[0].x)
    .toBeGreaterThan(480);
  await page.keyboard.up("KeyD");
  await page.keyboard.press("KeyJ", { delay: 90 });
  await page.keyboard.press("KeyK", { delay: 90 });
  await expect
    .poll(async () => (await state(page)).match!.fighters[0].combo)
    .toBeGreaterThanOrEqual(2);
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "FULL METERS" }).click();
  await page.keyboard.press("KeyO");
  await expect
    .poll(async () => (await state(page)).match!.fighters[0].move)
    .toBe("special2");
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: "FULL METERS" }).click();
  await page.keyboard.press("KeyP");
  await expect
    .poll(async () => (await state(page)).match!.fighters[0].move)
    .toBe("special3");
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: "FULL METERS" }).click();
  await page.keyboard.press("Space");
  await expect
    .poll(async () => (await state(page)).match!.cinematic)
    .toBeGreaterThan(0);
  expect((await state(page)).match!.fighters[0].superMeter).toBe(0);
});
test("virtual joystick supports a diagonal and simultaneous attack", async ({
  page,
}) => {
  test.skip(test.info().project.name === "desktop");
  await choose(page, "TRAINING", "BUCKET");
  await expect.poll(async () => (await state(page)).match?.phase).toBe("fight");
  const cdp = await page.context().newCDPSession(page),
    joy = (await page.locator(".joystick").boundingBox())!,
    punch = (await page.locator(".touch-key.punch").boundingBox())!;
  const direction = {
      x: joy.x + joy.width * 0.8,
      y: joy.y + joy.height * 0.18,
      id: 1,
    },
    attack = {
      x: punch.x + punch.width / 2,
      y: punch.y + punch.height / 2,
      id: 2,
    };
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [direction],
  });
  await page.waitForTimeout(150);
  expect((await state(page)).match!.fighters[0].y).toBeLessThan(300);
  expect((await state(page)).match!.fighters[0].x).toBeGreaterThan(245);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [direction, attack],
  });
  await page.waitForTimeout(100);
  expect((await state(page)).match!.fighters[0].state).toBe("attack");
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
});
test("saved final level loads the distinct Frost Jamie boss and arena", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "caf-save",
      JSON.stringify({
        version: 2,
        tutorial: true,
        progress: 5,
        campaign: { fighter: "jamie", index: 5, score: 9000, continues: 2 },
        settings: { muted: true },
      }),
    ),
  );
  await choose(page, "ARCADE", "JAMIE");
  await expect.poll(async () => (await state(page)).match?.phase).toBe("fight");
  const m = (await state(page)).match!;
  expect(m.fighters[1].id).toBe("frost");
  expect((await state(page)).stage).toBe(5);
  expect((await state(page)).campaign?.index).toBe(8);
  expect((await state(page)).campaign?.continues).toBe(2);
});
test("ten real input-driven bouts reach the boss, continue, ending and leaderboard", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "desktop",
    "Shared campaign logic; mobile layout/input are covered separately",
  );
  test.setTimeout(180000);
  await page.addInitScript(() => {
    if (localStorage.getItem("caf-save")) return;
    localStorage.setItem(
      "caf-save",
      JSON.stringify({ version: 2, tutorial: true, settings: { muted: true } }),
    );
  });
  await choose(page, "ARCADE");
  let victories = 0,
    continues = 0,
    earnedContinues = 0,
    observedPhase = 0,
    santaPhase = 0,
    attempt = 0;
  for (let bout = 0; bout < 16 && victories < 10; bout++) {
    const creditsBefore = (await state(page)).campaign?.continues || 0;
    const result = await drivenBout(page, 7 + attempt);
    expect(result.frames).toBeLessThan(25000);
    expect(result.screen).toBe("results");
    observedPhase = Math.max(observedPhase, result.maxPhase);
    if (result.opponent === "santa")
      santaPhase = Math.max(santaPhase, result.maxPhase);
    if (result.winner === 0) {
      victories++;
      if (result.opponent === "rob")
        earnedContinues += Math.max(
          0,
          ((await state(page)).campaign?.continues || 0) - creditsBefore,
        );
      attempt = 0;
      if (victories < 10)
        await page.getByRole("button", { name: "NEXT CHALLENGER" }).click();
    } else {
      continues++;
      attempt++;
      expect(continues).toBeLessThanOrEqual(3 + earnedContinues);
      await page.getByRole("button", { name: /CONTINUE \/ REMATCH/ }).click();
    }
  }
  expect(victories).toBe(10);
  expect(observedPhase).toBe(2);
  expect(santaPhase).toBe(2);
  expect((await state(page)).campaign?.completed).toBe(true);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("caf-save")!).unlocked,
    ),
  ).toEqual(expect.arrayContaining(["rob", "santa"]));
  const savedScores = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("caf-save")!).scores);
  // The result must already be persisted before navigating to the ending.
  expect(
    (await savedScores()).filter(
      (x: { result: string }) => x.result === "champion",
    ),
  ).toHaveLength(1);
  await page.getByRole("button", { name: "THE CHRISTMAS CHAMPION" }).click();
  expect(
    (await savedScores()).filter(
      (x: { result: string }) => x.result === "champion",
    ),
  ).toHaveLength(1);
  await expect(
    page.getByRole("heading", { name: "CHRISTMAS ARCADE CHAMPION." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "HIGH SCORES" }).click();
  await expect(page.locator(".leaderboard")).toContainText("CHAMPION");
  await expect(page.locator(".leaderboard")).toContainText("NASH");
  if (process.env.V3_CAPTURE) {
    const fs = await import("node:fs");
    fs.mkdirSync("docs/review-v3", { recursive: true });
    await page.screenshot({
      path: "docs/review-v3/earned-championship-leaderboard.png",
    });
  }
  await page.reload();
  await chooseMode(page, "TRAINING");
  await page.locator("[data-action=pick-rob]").click();
  await page.getByRole("button", { name: "CHOOSE STAGE" }).click();
  await page.getByRole("button", { name: "START FIGHT" }).click();
  await expect.poll(async () => (await state(page)).match?.phase).toBe("fight");
  expect((await state(page)).match!.fighters[0]).toMatchObject({
    id: "rob",
    profile: "standard",
    health: 110,
  });
  await page
    .getByRole("button", { name: "SPRITE INSPECTOR", exact: true })
    .click();
  await expect(page.locator("#inspect-frame")).toHaveAttribute("max", "31");
  await page.locator("#inspect-atlas").selectOption("special");
  await expect(page.locator("#inspect-frame")).toHaveAttribute("max", "23");
});
test("survival advances with measured partial health recovery", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "desktop");
  test.setTimeout(90000);
  await page.addInitScript(() =>
    localStorage.setItem(
      "caf-save",
      JSON.stringify({ version: 2, tutorial: true, settings: { muted: true } }),
    ),
  );
  await choose(page, "SURVIVAL");
  const result = await drivenBout(page, 7);
  expect(result.winner).toBe(0);
  expect((await state(page)).match!.roundsToWin).toBe(1);
  await page.getByRole("button", { name: "NEXT CHALLENGER" }).click();
  expect((await state(page)).campaign?.index).toBe(1);
  expect((await state(page)).match!.fighters[0].health).toBe(
    Math.min(118, result.health! + 24),
  );
});

test("a short press/release between frames is latched until the simulation consumes it", async ({
  page,
}) => {
  await choose(page, "TRAINING", "JAMIE");
  await expect.poll(async () => (await state(page)).match?.phase).toBe("fight");
  await page.getByRole("button", { name: "FULL METERS" }).click();
  await page.evaluate(() => {
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", { code: "KeyI", bubbles: true }),
    );
    document.body.dispatchEvent(
      new KeyboardEvent("keyup", { code: "KeyI", bubbles: true }),
    );
  });
  await expect
    .poll(async () => (await state(page)).match!.nextProjectile)
    .toBeGreaterThan(0);
});

test("required artwork failures show a retry screen rather than placeholder fighters", async ({
  page,
}) => {
  await page.route("**/atlases/jamie.webp", (route) => route.abort());
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("ARTWORK COULDN’T LOAD");
  await expect(
    page.getByRole("button", { name: "RETRY LOADING" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "ARCADE", exact: true }),
  ).toHaveCount(0);
});

test("interactive tutorial advances on real actions and saves completion", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /HOW TO PLAY/ }).click();
  await page.getByRole("button", { name: /TRY IT LIVE/ }).click();
  await expect.poll(async () => (await state(page)).match?.phase).toBe("fight");
  await page.keyboard.down("KeyD");
  await expect.poll(async () => (await state(page)).tutorialStep).toBe(1);
  await page.keyboard.up("KeyD");
  await page.keyboard.press("KeyW");
  await expect.poll(async () => (await state(page)).tutorialStep).toBe(2);
  await page.keyboard.down("KeyD");
  await expect
    .poll(async () => (await state(page)).match!.fighters[0].x)
    .toBeGreaterThan(480);
  await page.keyboard.up("KeyD");
  await page.keyboard.press("KeyJ");
  await expect.poll(async () => (await state(page)).tutorialStep).toBe(3);
  await page.keyboard.down("KeyA");
  await expect.poll(async () => (await state(page)).tutorialStep).toBe(4);
  await page.keyboard.up("KeyA");
  await page.waitForTimeout(500);
  await page.keyboard.press("KeyI");
  await expect.poll(async () => (await state(page)).tutorialStep).toBe(5);
  await page.waitForTimeout(1000);
  await page.keyboard.press("Space");
  await expect.poll(async () => (await state(page)).tutorialStep).toBe(6);
  await page.getByRole("button", { name: /FINISH TUTORIAL/ }).click();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("caf-save")!).tutorial,
    ),
  ).toBe(true);
});
