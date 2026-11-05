import { menuReady, chooseMode } from "./helpers";
import { test, expect, type Page } from "@playwright/test";
type Snapshot = {
  screen: string;
  match: {
    phase: string;
    fighters: {
      x: number;
      y: number;
      health: number;
      meter: number;
      state: string;
      wins: number;
    }[];
    timer: number;
  } | null;
};
async function openSettings(page: Page) {
  await menuReady(page);
  await page.locator("[data-action=settings]").click();
}
const state = (page: Page) =>
  page.evaluate(() => (window as unknown as { __CAF__: Snapshot }).__CAF__);
async function launch(page: Page, mode = "TRAINING") {
  await page.goto("/");
  await chooseMode(page, mode);
  await page.getByRole("button", { name: "CHOOSE STAGE" }).click();
  await page.getByRole("button", { name: "START FIGHT" }).click();
  if (await page.getByRole("button", { name: "GOT IT." }).isVisible())
    await page.getByRole("button", { name: "GOT IT." }).click();
  await expect.poll(async () => (await state(page)).match?.phase).toBe("fight");
}
test("loads, navigates, selects a fighter and starts responsive combat", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "CHRISTMAS ARCADE FIGHTERS" }),
  ).toBeVisible();
  const frames = await page.evaluate(async () => {
    const moduleUrl = "/src/main.ts";
    const { game } = await import(moduleUrl);
    return ["jamie", "nash", "bucket", "beardy"].map(
      (id) => game.textures.get(id).frameTotal,
    );
  });
  expect(frames).toEqual([49, 49, 49, 49]);
  await page.getByRole("button", { name: "HOW TO PLAY" }).click();
  await expect(page.getByText("BRING THE HOLIDAY HEAT.")).toBeVisible();
  await page.getByRole("button", { name: "BACK TO THE ARCADE" }).click();
  await launch(page);
  const before = (await state(page)).match!.fighters[0].x;
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(250);
  await page.keyboard.up("KeyD");
  expect((await state(page)).match!.fighters[0].x).toBeGreaterThan(before);
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(120);
  expect((await state(page)).match!.fighters[0].y).toBeLessThan(300);
  await page.keyboard.up("KeyW");
  await page.getByRole("button", { name: "Pause game" }).click();
  await expect(page.getByText("ON ICE.")).toBeVisible();
  const timer = (await state(page)).match!.timer;
  await page.waitForTimeout(100);
  expect((await state(page)).match!.timer).toBe(timer);
  await page.getByRole("button", { name: "BACK TO THE FIGHT" }).click();
  await expect(page.locator("#hud")).toBeVisible();
  expect(errors).toEqual([]);
  await page.screenshot({
    path: `test-results/${test.info().project.name}-match.png`,
  });
});
test("settings persist and all stages are selectable", async ({ page }) => {
  await page.goto("/");
  await openSettings(page);
  await page.locator("#difficulty").selectOption("hard");
  await page.locator("#reduced").check();
  await page.locator("[data-action=remap-punch]").click();
  await page.keyboard.press("KeyF");
  await page.getByRole("button", { name: "DONE" }).click();
  await page.reload();
  await openSettings(page);
  await expect(page.locator("#difficulty")).toHaveValue("hard");
  await expect(page.locator("#reduced")).toBeChecked();
  await expect(page.locator("[data-action=remap-punch] kbd")).toHaveText("F");
  await page.getByRole("button", { name: "DONE" }).click();
  if (
    await page.getByRole("button", { name: "ARCADE", exact: true }).isVisible()
  )
    await menuReady(page);
  await chooseMode(page, "TRAINING");
  await page.getByRole("button", { name: /NASH.*REINDEER/ }).click();
  await page.getByRole("button", { name: "CHOOSE STAGE" }).click();
  for (const text of [
    "SEASIDE PIER",
    "SANTA’S WORKSHOP",
    "FROZEN FOREST",
    "FROZEN ROOFTOPS",
    "FROST FORTRESS",
    "VILLAGE SQUARE",
    "THE COLLECTION HALL",
    "SANTA’S THRONE · NORTH POLE",
    "THE COLLECTION HALL",
    "SANTA’S THRONE · NORTH POLE",
  ]) {
    const b = page
      .getByRole("button")
      .filter({ has: page.locator("strong", { hasText: text }) });
    await b.click();
    await expect(b).toHaveClass(/selected/);
  }
});
test("CPU can win a full match, results and rematch work", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "caf-save",
      JSON.stringify({
        version: 1,
        tutorial: true,
        settings: { difficulty: "hard" },
      }),
    );
  });
  await launch(page, "ARCADE");
  await expect
    .poll(async () => (await state(page)).screen, {
      timeout: 70000,
      intervals: [500],
    })
    .toBe("results");
  await expect(page.getByRole("heading", { name: /WINS/ })).toBeVisible();
  await page.getByRole("button", { name: "REMATCH" }).click();
  await expect.poll(async () => (await state(page)).match?.phase).toBe("fight");
  expect((await state(page)).match!.fighters[0].wins).toBe(0);
});
test("touch holds movement and attack together without sticking", async ({
  page,
  browserName,
}) => {
  test.skip(
    test.info().project.name === "desktop" || browserName !== "chromium",
  );
  await launch(page);
  const cdp = await page.context().newCDPSession(page);
  const d = await page
    .getByRole("button", { name: "Move right", exact: true })
    .boundingBox();
  const p = await page.locator(".touch-key.punch").boundingBox();
  expect(d).toBeTruthy();
  expect(p).toBeTruthy();
  const point = (b: NonNullable<typeof d>, id: number) => ({
    x: b.x + b.width / 2,
    y: b.y + b.height / 2,
    id,
  });
  const before = (await state(page)).match!.fighters[0].x;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [point(d!, 1), point(p!, 2)],
  });
  await page.waitForTimeout(160);
  expect((await state(page)).match!.fighters[0].state).toBe("attack");
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [point(p!, 2)],
  });
  await page.waitForTimeout(600);
  expect((await state(page)).match!.fighters[0].x).toBeGreaterThan(before);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForTimeout(100);
  const after = (await state(page)).match!.fighters[0].x;
  await page.waitForTimeout(150);
  expect((await state(page)).match!.fighters[0].x).toBe(after);
});
test("local versus accepts two independent keyboard control sets", async ({
  page,
}) => {
  await launch(page, "VERSUS");
  await page.keyboard.down("KeyD");
  await page.keyboard.down("ArrowLeft");
  await page.waitForTimeout(300);
  await page.keyboard.up("KeyD");
  await page.keyboard.up("ArrowLeft");
  expect((await state(page)).match!.fighters[0].x).toBeGreaterThan(245);
  expect((await state(page)).match!.fighters[1].x).toBeLessThan(555);
  await page.keyboard.down("KeyJ");
  await page.keyboard.down("Numpad2");
  await page.waitForTimeout(70);
  expect((await state(page)).match!.fighters.map((f) => f.state)).toEqual([
    "attack",
    "attack",
  ]);
  await page.keyboard.up("KeyJ");
  await page.keyboard.up("Numpad2");
});
test("a standard gamepad navigates menus and drives combat", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const pad = {
      axes: [0, 0],
      buttons: Array.from({ length: 17 }, () => ({
        pressed: false,
        value: 0,
        touched: false,
      })),
    };
    Object.defineProperty(window, "testPad", { value: pad });
    Object.defineProperty(navigator, "getGamepads", { value: () => [pad] });
  });
  const press = async (button: number) => {
    await page.evaluate((n) => {
      const p = (
        window as unknown as { testPad: { buttons: { pressed: boolean }[] } }
      ).testPad;
      p.buttons[n].pressed = true;
    }, button);
    await page.waitForTimeout(100);
    await page.evaluate((n) => {
      (
        window as unknown as { testPad: { buttons: { pressed: boolean }[] } }
      ).testPad.buttons[n].pressed = false;
    }, button);
    await page.waitForTimeout(100);
  };
  await page.goto("/");
  await menuReady(page);
  await press(13);
  await press(13);
  await press(0);
  await expect(page.getByText("CHOOSE YOUR FIGHTER.")).toBeVisible();
  await page.locator("#opponent").focus();
  const old = await page.locator("#opponent").inputValue();
  await press(15);
  expect(await page.locator("#opponent").inputValue()).not.toBe(old);
  await page.getByRole("button", { name: "CHOOSE STAGE" }).click();
  await page.getByRole("button", { name: "START FIGHT" }).click();
  await page.getByRole("button", { name: "GOT IT." }).click();
  await expect.poll(async () => (await state(page)).match?.phase).toBe("fight");
  const x = (await state(page)).match!.fighters[0].x;
  await page.evaluate(() => {
    (window as unknown as { testPad: { axes: number[] } }).testPad.axes[0] = 1;
  });
  await page.waitForTimeout(250);
  await page.evaluate(() => {
    (window as unknown as { testPad: { axes: number[] } }).testPad.axes[0] = 0;
  });
  expect((await state(page)).match!.fighters[0].x).toBeGreaterThan(x);
  const observed = await page.evaluate(async () => {
    const win = window as unknown as {
      testPad: { buttons: { pressed: boolean }[] };
      __CAF__: Snapshot;
    };
    win.testPad.buttons[0].pressed = true;
    const states = [];
    for (let i = 0; i < 8; i++) {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      states.push(win.__CAF__.match!.fighters[0].state);
    }
    win.testPad.buttons[0].pressed = false;
    return states;
  });
  expect(observed).toContain("attack");
});
test("saved arcade bouts resume and restart against the same rival", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "caf-save",
      JSON.stringify({
        version: 1,
        tutorial: true,
        progress: 2,
        settings: { difficulty: "easy" },
      }),
    ),
  );
  await launch(page, "ARCADE");
  const before = await page.locator(".p2 .name-line b").textContent();
  await page.getByRole("button", { name: "Pause game" }).click();
  await page.getByRole("button", { name: "RESTART MATCH" }).click();
  await expect.poll(async () => (await state(page)).match?.phase).toBe("fight");
  expect(await page.locator(".p2 .name-line b").textContent()).toBe(before);
  expect((await state(page)).match!.fighters[0].wins).toBe(0);
});
