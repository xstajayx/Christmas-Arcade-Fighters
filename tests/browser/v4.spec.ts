import { test, expect, type Page } from "@playwright/test";
import type Phaser from "phaser";
import type { Match } from "../../src/combat/engine";
type Harness = { __CAF__: { match: Match }; v4game: Phaser.Game };
const state = () => {
  const m = (window as unknown as Harness).__CAF__.match;
  return { a: { ...m.fighters[0] }, b: { ...m.fighters[1] }, events: m.events };
};
async function start(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem(
      "caf-save",
      JSON.stringify({ version: 3, tutorial: true, settings: { muted: true } }),
    ),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "TRAINING", exact: true }).click();
  await page.locator("#opponent").selectOption("beardy");
  await page.getByRole("button", { name: "CHOOSE STAGE" }).click();
  await page.getByRole("button", { name: "START FIGHT" }).click();
  await page.waitForFunction(
    () => (window as unknown as Harness).__CAF__.match.phase === "fight",
  );
  await page.evaluate(async () => {
    const path = [...document.scripts].find(
      (s) => new URL(s.src).pathname === "/src/main.ts",
    )!.src;
    const { game } = await import(path);
    game.loop.stop();
    (window as unknown as Harness).v4game = game;
    const scene = game.scene.getScene("Arena") as unknown as {
      bridge: { match: Match };
    };
    const [a, b] = scene.bridge.match.fighters;
    a.x = a.previousX = 350;
    b.x = b.previousX = 450;
  });
}
async function frames(page: Page, n: number) {
  await page.evaluate((n) => {
    const game = (window as unknown as Harness).v4game;
    for (let i = 0; i < n; i++)
      game.step(performance.now() + (i * 1000) / 60, 1000 / 60);
  }, n);
}
test.beforeEach(async ({ browserName }, info) => {
  test.skip(
    browserName !== "chromium" || info.project.name !== "desktop",
    "Explicit device contexts below",
  );
});
test("rendered Jamie–Beardy launch, jump cancel, air hit and recovery through real keyboard input", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  await page.keyboard.down("ShiftLeft");
  await page.keyboard.down("KeyJ");
  await frames(page, 15);
  await page.keyboard.up("KeyJ");
  await page.keyboard.up("ShiftLeft");
  let s = await page.evaluate(state);
  expect(s.b.state).toBe("airHit");
  expect(s.b.juggles).toBe(1);
  await page.keyboard.down("KeyW");
  await page.keyboard.down("KeyD");
  await frames(page, 10);
  await page.keyboard.up("KeyW");
  s = await page.evaluate(state);
  expect(s.a.y).toBeLessThan(300);
  await frames(page, 6);
  await page.keyboard.down("KeyJ");
  await frames(page, 1);
  await page.keyboard.up("KeyJ");
  await frames(page, 7);
  s = await page.evaluate(state);
  expect(s.b.juggles).toBe(2);
  expect(s.a.move).toBe("airPunch");
  await page.screenshot({ path: "/tmp/v4-air-combat.png" });
  await page.keyboard.up("KeyD");
  await frames(page, 150);
  s = await page.evaluate(state);
  expect(s.a.state).toBe("idle");
  expect(s.b.state).toBe("idle");
  expect(s.a.y).toBe(300);
  expect(s.b.y).toBe(300);
  await page.screenshot({ path: "/tmp/v4-recovered.png" });
  expect(errors).toEqual([]);
});
for (const width of [844, 915])
  test(`real multitouch diagonal jump plus attack, release and cancel at ${width}px`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width, height: width === 844 ? 390 : 412 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await start(page);
    const cdp = await context.newCDPSession(page);
    const joy = (await page.locator(".joystick").boundingBox())!,
      punch = (await page.locator(".actions .punch").boundingBox())!;
    const first = {
      id: 1,
      x: joy.x + joy.width * 0.85,
      y: joy.y + joy.height * 0.15,
    };
    const second = {
      id: 2,
      x: punch.x + punch.width / 2,
      y: punch.y + punch.height / 2,
    };
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [first, second],
    });
    await frames(page, 7);
    let s = await page.evaluate(state);
    expect(s.a.y).toBeLessThan(270);
    // Initial take-off still respects grounded pushboxes before clearing them.
    expect(s.a.x).toBeGreaterThan(360);
    expect(s.a.move).toBe("airPunch");
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await frames(page, 100);
    s = await page.evaluate(state);
    expect(s.a.state).toBe("idle");
    expect(s.a.previous.punch).not.toBe(true);
    expect(s.a.previous.up).not.toBe(true);
    // Cancellation clears both held and unconsumed edge inputs before simulation.
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [first, second],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchCancel",
      touchPoints: [],
    });
    await frames(page, 2);
    s = await page.evaluate(state);
    expect(s.a.state).toBe("idle");
    expect(s.a.previous.up).not.toBe(true);
    expect(s.a.previous.punch).not.toBe(true);
    await context.close();
  });
