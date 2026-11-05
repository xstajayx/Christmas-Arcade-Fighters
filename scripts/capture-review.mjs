// Capture unedited evidence from the real running game; no combat-state mutation.
// Start npm run dev -- --port 5173 first. Requires Playwright's Chromium or /usr/bin/chromium.
import { chromium, devices } from "@playwright/test";
import { mkdirSync, writeFileSync, renameSync, existsSync } from "node:fs";
const output = "docs/review";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch(
  existsSync("/usr/bin/chromium")
    ? { executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] }
    : {},
);
const errors = [];
const base = process.env.REVIEW_URL || "http://127.0.0.1:5173/";
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  recordVideo: { dir: output, size: { width: 960, height: 667 } },
});
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
async function action(name) {
  await page.locator(`[data-action="${name}"]`).click();
}
async function readyFight() {
  if (await page.getByRole("button", { name: "GOT IT." }).isVisible())
    await page.getByRole("button", { name: "GOT IT." }).click();
  await page.waitForFunction(() => window.__CAF__?.match?.phase === "fight");
}
async function training(id, stage) {
  await action("training");
  await action("pick-" + id);
  await action("stages");
  await action("stage-" + stage);
  await action("start");
  await readyFight();
}
await page.goto(base);
await page.getByRole("button", { name: "LET’S FIGHT" }).waitFor();
await page.screenshot({ path: output + "/title.png" });
await action("menu");
await page.screenshot({ path: output + "/modes.png" });
await action("training");
await page.screenshot({ path: output + "/characters.png" });
await action("stages");
await page.screenshot({ path: output + "/stages.png" });
await action("stage-0");
await action("start");
await readyFight();
for (const [i, id] of ["jamie", "nash", "bucket", "beardy"].entries()) {
  if (i) {
    await page.keyboard.press("Escape");
    await action("quit");
    await training(id, i);
  }
  await page.screenshot({ path: `${output}/${id}-arena.png` });
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(id === "nash" ? 1700 : 1400);
  await page.keyboard.up("KeyD");
  await page.keyboard.press("KeyW");
  await page.waitForTimeout(700);
  await page.keyboard.press("KeyJ", { delay: 90 });
  await page.keyboard.press("KeyK", { delay: 90 });
  await page.waitForTimeout(650);
  for (const key of ["KeyI", "KeyO", "KeyP"]) {
    await page.getByRole("button", { name: "FULL METERS" }).click();
    await page.keyboard.press(key);
    await page.waitForTimeout(850);
  }
  await page.getByRole("button", { name: "FULL METERS" }).click();
  await page.keyboard.press("Space");
  await page.waitForTimeout(180);
  await page.screenshot({ path: `${output}/${id}-super.png` });
  await page.waitForTimeout(1900);
}
for (const stage of [4, 5]) {
  await page.keyboard.press("Escape");
  await action("quit");
  await training("jamie", stage);
  await page.screenshot({ path: `${output}/arena-${stage + 1}.png` });
}
await page.keyboard.press("Escape");
await action("quit");
await action("cpu");
await action("pick-jamie");
await page.locator("#opponent").selectOption("nash");
await page.locator("#cpu-difficulty").selectOption("master");
await action("stages");
await action("stage-0");
await action("start");
await readyFight();
const timing = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const times = [];
      let before = performance.now();
      function frame(now) {
        times.push(now - before);
        before = now;
        if (times.length < 180) requestAnimationFrame(frame);
        else {
          times.sort((a, b) => a - b);
          resolve({
            samples: times.length,
            medianMs: times[90],
            p95Ms: times[171],
            note: "Headless Linux Chromium only; not physical-device performance approval",
          });
        }
      }
      requestAnimationFrame(frame);
    }),
);
// Observe a real CPU match through KO/results, without health or clock mutation.
await page.waitForFunction(() => window.__CAF__?.screen === "results", null, {
  timeout: 120000,
});
await page.waitForTimeout(300);
await page.screenshot({ path: output + "/match-result.png" });
const video = page.video();
await context.close();
renameSync(await video.path(), output + "/gameplay.webm");
const mobile = await browser.newContext({
  ...devices["Pixel 7"],
  viewport: { width: 915, height: 412 },
});
const phone = await mobile.newPage();
phone.on("pageerror", (e) => errors.push(e.message));
await phone.goto(base);
await phone.getByRole("button", { name: "LET’S FIGHT" }).click();
await phone.locator("[data-action=training]").click();
await phone.locator("[data-action=pick-bucket]").click();
await phone.locator("[data-action=stages]").click();
await phone.locator("[data-action=stage-1]").click();
await phone.locator("[data-action=start]").click();
if (await phone.getByRole("button", { name: "GOT IT." }).isVisible())
  await phone.getByRole("button", { name: "GOT IT." }).click();
await phone.waitForFunction(() => window.__CAF__?.match?.phase === "fight");
await phone.screenshot({ path: output + "/mobile-controls.png" });
await mobile.close();
const boss = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
await boss.addInitScript(() =>
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
const b = await boss.newPage();
await b.goto(base);
await b.getByRole("button", { name: "LET’S FIGHT" }).click();
for (const a of ["arcade", "stages", "start"])
  await b.locator(`[data-action=${a}]`).click();
await b.waitForFunction(() => window.__CAF__?.match?.phase === "intro");
await b.screenshot({ path: output + "/boss-introduction.png" });
await b.waitForFunction(() => window.__CAF__?.match?.phase === "fight");
await b.screenshot({ path: output + "/boss-match.png" });
await boss.close();
writeFileSync(
  output + "/capture.json",
  JSON.stringify(
    {
      url: base,
      recording:
        "Real-time keyboard input in training with explicit FULL METERS practice control, then an unattended Versus CPU match through KO/results. No health/timer/winner mutation. Silent Playwright WebM. Boss screenshots use a validated final-level save fixture, not evidence of reaching it through this recording.",
      timing,
      errors,
    },
    null,
    2,
  ) + "\n",
);
await browser.close();
if (errors.length) throw Error(errors.join("\n"));
