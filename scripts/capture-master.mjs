import { chromium, devices } from "@playwright/test";
import { mkdirSync, writeFileSync, renameSync } from "node:fs";
const out = "docs/review-master",
  url =
    process.env.REVIEW_URL ||
    "http://127.0.0.1:4180/Christmas-Arcade-Fighters/";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const errors = [];
const shots = [];
const click = (page, action) =>
  page.locator(`[data-action="${action}"]`).click();
async function shot(page, name) {
  await page.screenshot({ path: `${out}/${name}.png` });
  shots.push(name);
}
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  recordVideo: { dir: out, size: { width: 960, height: 666 } },
});
await context.addInitScript(() =>
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
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.stack));
await page.goto(url);
await page.getByRole("button", { name: "ARCADE", exact: true }).waitFor();
const build = await page.evaluate(() => window.__CAF__.build);
await shot(page, "menu");
for (const [id, stage] of [
  ["jamie", 0],
  ["nash", 1],
  ["bucket", 2],
  ["beardy", 3],
  ["rob", 6],
  ["santa", 7],
]) {
  await click(page, "training");
  await click(page, "pick-" + id);
  await click(page, "stages");
  await click(page, "stage-" + stage);
  await click(page, "start");
  await page.waitForFunction(() => window.__CAF__.match.phase === "fight");
  await page.getByRole("button", { name: "FULL METERS" }).click();
  await page.keyboard.down("KeyS");
  await page.keyboard.press("KeyO");
  await page.keyboard.up("KeyS");
  await page.waitForTimeout(430);
  await shot(page, id + "-projectile");
  await page.waitForTimeout(750);
  await page.keyboard.down("KeyD");
  await page.waitForFunction(
    () =>
      Math.abs(
        window.__CAF__.match.fighters[1].x - window.__CAF__.match.fighters[0].x,
      ) < 126,
  );
  await page.keyboard.up("KeyD");
  await page.waitForTimeout(200);
  await shot(page, id + "-spacing");
  if (id === "jamie") {
    await page.locator("#show-hitboxes").check();
    await shot(page, "collision-geometry");
    await page.locator("#show-hitboxes").uncheck();
  }
  await page.getByRole("button", { name: "FULL METERS" }).click();
  await page.keyboard.press("KeyI");
  await page.waitForTimeout(300);
  await shot(page, id + "-dash");
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "FULL METERS" }).click();
  await page.keyboard.press("Space");
  await page.waitForTimeout(800);
  await shot(page, id + "-super");
  await page.waitForTimeout(1000);
  if (id === "nash") {
    await page.keyboard.down("KeyD");
    await page.waitForFunction(
      () =>
        Math.abs(
          window.__CAF__.match.fighters[1].x -
            window.__CAF__.match.fighters[0].x,
        ) < 126,
    );
    await page.keyboard.up("KeyD");
    await page.waitForTimeout(300);
    await page.keyboard.press("KeyU");
    await page.waitForFunction(() => {
      const t = window.__CAF__.match.throwSequence;
      return t && t.frame >= 8 && t.frame < 20;
    });
    await shot(page, "linked-throw");
    await page.waitForTimeout(1100);
  }
  await page.locator("#pause-button").click();
  await click(page, "quit");
}
await click(page, "settings");
for (const tab of ["AUDIO", "CONTROLS", "GAMEPLAY"]) {
  await page.getByRole("button", { name: tab, exact: true }).click();
  await shot(page, "options-" + tab.toLowerCase());
  if (tab === "CONTROLS")
    for (const sub of ["KEYBOARD", "GAMEPAD"]) {
      await page.getByRole("button", { name: sub, exact: true }).click();
      await shot(page, "options-" + sub.toLowerCase());
    }
}
const video = page.video();
await context.close();
renameSync(await video.path(), out + "/gameplay.webm");
for (const [name, device, width, height] of [
  ["android", "Pixel 7", 915, 412],
  ["iphone", "iPhone 13", 844, 390],
]) {
  const ctx = await browser.newContext({
    ...devices[device],
    viewport: { width, height },
  });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(e.stack));
  await p.goto(url);
  await p.getByRole("button", { name: "ARCADE", exact: true }).waitFor();
  await click(p, "settings");
  for (const tab of ["AUDIO", "CONTROLS", "GAMEPLAY"]) {
    await p.getByRole("button", { name: tab, exact: true }).click();
    await shot(p, name + "-options-" + tab.toLowerCase());
    if (tab === "CONTROLS")
      for (const sub of ["KEYBOARD", "GAMEPAD"]) {
        await p.getByRole("button", { name: sub, exact: true }).click();
        await shot(p, name + "-options-" + sub.toLowerCase());
      }
  }
  await p.getByRole("button", { name: "SAVE & RETURN" }).click();
  await click(p, "training");
  await click(p, "stages");
  await click(p, "start");
  await p.getByRole("button", { name: "GOT IT." }).click();
  await p.waitForFunction(() => window.__CAF__.match.phase === "fight");
  await shot(p, name + "-controls");
  await ctx.close();
}
writeFileSync(
  out + "/capture.json",
  JSON.stringify(
    {
      build,
      url,
      errors,
      shots,
      note: "Unedited final production screenshots and silent real-time gameplay. Desktop declares unlocked roster for training review and uses visible FULL METERS. Does not grant unlock evidence or mutate combat health/timers/winners. SP2 is pressed while crouching to exercise direction independence.",
    },
    null,
    2,
  ) + "\n",
);
await browser.close();
if (errors.length) throw Error(errors.join("\n"));
