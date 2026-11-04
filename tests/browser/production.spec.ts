import { test, expect } from "@playwright/test";
const root =
  process.env.PAGES_TEST_URL ||
  "http://127.0.0.1:4180/Christmas-Arcade-Fighters/";
type Diagnostics = {
  build: string;
  screen: string;
  stage: number;
  rendering: {
    frames: Record<string, number>;
    stages: boolean[];
    audio: string;
  };
  match: {
    phase: string;
    fighters: { x: number; health: number; state: string }[];
  } | null;
};
const snapshot = () => (window as unknown as { __CAF__: Diagnostics }).__CAF__;

test("compiled Pages artifact renders styles, all assets and a playable match", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("requestfailed", (r) =>
    errors.push(`${r.url()}: ${r.failure()?.errorText}`),
  );
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  const response = await request.get(root);
  expect(response.ok()).toBeTruthy();
  const html = await response.text();
  expect(html).not.toContain("/src/main.ts");
  expect(html).toMatch(
    /src="\/Christmas-Arcade-Fighters\/assets\/[^"\s]+\.js"/,
  );
  expect(html).toMatch(
    /href="\/Christmas-Arcade-Fighters\/assets\/[^"\s]+\.css"/,
  );
  for (const asset of [
    ...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g),
  ].map((m) => m[1])) {
    const file = await request.get(new URL(asset, root).href);
    expect(file.ok()).toBeTruthy();
    expect(file.headers()["content-type"]).toContain(
      asset.endsWith(".js") ? "javascript" : "text/css",
    );
  }
  // Strict server must not silently return HTML for missing scripts.
  expect(
    (await request.get(new URL("assets/missing.js", root).href)).status(),
  ).toBe(404);
  for (const asset of [
    "sprites/jamie.png",
    "sprites/nash.png",
    "sprites/bucket.png",
    "sprites/beardy.png",
    "icon-192.png",
    "manifest.webmanifest",
  ])
    expect((await request.get(new URL(asset, root).href)).ok()).toBeTruthy();
  await page.goto(root);
  await expect(page.getByRole("button", { name: "LET’S FIGHT" })).toBeVisible();
  await expect(page.locator("#overlay")).toHaveCSS("position", "absolute");
  await expect(page.locator("#game canvas")).toHaveAttribute("width", "800");
  expect(
    (await page.locator("#game canvas").screenshot()).length,
  ).toBeGreaterThan(10000);
  const art = await page.evaluate(snapshot);
  expect(Object.values(art.rendering.frames)).toEqual([13, 13, 13, 13]);
  expect(art.rendering.stages).toEqual([true, true, true, true]);
  await page.getByRole("button", { name: "LET’S FIGHT" }).click();
  await page
    .getByRole("button")
    .filter({ has: page.locator("strong", { hasText: "TRAINING" }) })
    .click();
  await page.getByRole("button", { name: /NASH.*THE PIER/ }).click();
  await page.getByRole("button", { name: "CHOOSE STAGE" }).click();
  await page
    .getByRole("button")
    .filter({ has: page.locator("strong", { hasText: "SEASIDE PIER" }) })
    .click();
  await page.getByRole("button", { name: "START FIGHT" }).click();
  await page.getByRole("button", { name: "GOT IT." }).click();
  await expect
    .poll(async () => (await page.evaluate(snapshot)).match?.phase)
    .toBe("fight");
  expect((await page.evaluate(snapshot)).stage).toBe(1);
  await expect
    .poll(async () => (await page.evaluate(snapshot)).rendering.audio)
    .toBe("running");
  const initial = (await page.evaluate(snapshot)).match!.fighters[0].x;
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(250);
  await page.keyboard.up("KeyD");
  expect((await page.evaluate(snapshot)).match!.fighters[0].x).toBeGreaterThan(
    initial,
  );
  // Reach the dummy and land real attacks through the production input path.
  await page.keyboard.down("KeyD");
  await expect
    .poll(async () => (await page.evaluate(snapshot)).match!.fighters[0].x)
    .toBeGreaterThan(480);
  await page.keyboard.up("KeyD");
  await page.keyboard.press("KeyK", { delay: 70 });
  await expect
    .poll(async () => (await page.evaluate(snapshot)).match!.fighters[1].health)
    .toBeLessThan(118);
  expect(errors).toEqual([]);
});

test("offline release ignores legacy stale shell caches", async ({
  page,
  context,
}) => {
  await page.goto(root);
  await expect(page.getByRole("button", { name: "LET’S FIGHT" })).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const build = (await page.evaluate(snapshot)).build;
  await page.evaluate(async () => {
    const cache = await caches.open("caf-stale-source-release");
    await cache.put(
      new URL("./", location.href),
      new Response(
        '<html><body>STALE SOURCE<script type="module" src="/src/main.ts"></script></body></html>',
        { headers: { "content-type": "text/html" } },
      ),
    );
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("button", { name: "LET’S FIGHT" })).toBeVisible();
  expect((await page.evaluate(snapshot)).build).toBe(build);
  expect(await page.locator("body").innerText()).not.toContain("STALE SOURCE");
  await context.setOffline(false);
});
