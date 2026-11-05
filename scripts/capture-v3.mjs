// Real-time production review. Save fixtures expose content, never force combat wins.
import { chromium, devices } from "@playwright/test";
import { build } from "esbuild";
import { mkdirSync, existsSync, renameSync, writeFileSync } from "node:fs";
const out = "docs/review-v3",
  url =
    process.env.REVIEW_URL ||
    "http://127.0.0.1:4180/Christmas-Arcade-Fighters/";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch(
  existsSync("/usr/bin/chromium")
    ? { executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] }
    : {},
);
const errors = [],
  bossResults = [];
const boot = async (page) => {
  page.on("pageerror", (e) => {
    errors.push(e.stack || e.message);
    if (errors.length === 1)
      console.error("FIRST PAGE ERROR", page.url(), e.stack);
  });
  await page.goto(url);
  await page.getByRole("button", { name: "ARCADE", exact: true }).waitFor();
};
const click = async (page, action) =>
  page.locator(`[data-action="${action}"]`).click();
const fight = async (page) =>
  page.waitForFunction(() => window.__CAF__?.match?.phase === "fight");
async function training(page, id, stage) {
  await click(page, "training");
  await click(page, "pick-" + id);
  await click(page, "stages");
  await click(page, "stage-" + stage);
  await click(page, "start");
  await fight(page);
}
async function quit(page) {
  await page.locator("#pause-button").click();
  await click(page, "quit");
}
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  recordVideo: { dir: out, size: { width: 960, height: 666 } },
});
// The fixture is for reviewing balanced unlocked fighters, not unlock evidence.
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
await boot(page);
const buildId = await page.evaluate(() => window.__CAF__.build);
await page.screenshot({ path: out + "/menu.png" });
await click(page, "training");
await page.screenshot({ path: out + "/roster.png" });
await click(page, "stages");
await page.screenshot({ path: out + "/arenas.png" });
await click(page, "start");
await fight(page);
await page.keyboard.down("KeyD");
await page.waitForTimeout(1500);
await page.keyboard.up("KeyD");
await page.keyboard.press("KeyW");
await page.waitForTimeout(200);
await page.screenshot({ path: out + "/camera-jump.png" });
await page.waitForTimeout(800);
await page
  .getByRole("button", { name: "SPRITE INSPECTOR", exact: true })
  .click();
await page.locator("#inspect-frame").fill("11");
await page.screenshot({ path: out + "/sprite-inspector.png" });
await page.getByRole("button", { name: "CLOSE INSPECTOR" }).click();
await page.keyboard.down("KeyD");
await page.waitForFunction(
  () =>
    window.__CAF__.match.fighters[1].x - window.__CAF__.match.fighters[0].x <
    53,
);
await page.keyboard.up("KeyD");
await page.keyboard.press("KeyU");
await page.waitForFunction(() => {
  const t = window.__CAF__.match.throwSequence;
  return t && t.frame >= 8 && t.frame < 20;
});
await page.screenshot({ path: out + "/throw-hold.png" });
await page.waitForTimeout(900);
await page.screenshot({ path: out + "/throw-release.png" });
await page.locator("#dummy").selectOption("attack");
await page.keyboard.down("KeyA");
await page.waitForFunction(
  () => window.__CAF__.match.fighters[0].state === "block",
);
await page.screenshot({ path: out + "/directional-guard.png" });
await page.keyboard.up("KeyA");
await page.locator("#dummy").selectOption("stand");
for (const [id, stage] of [
  ["jamie", 0],
  ["nash", 1],
  ["bucket", 3],
  ["beardy", 4],
  ["rob", 6],
  ["santa", 7],
]) {
  await quit(page);
  await training(page, id, stage);
  await page.getByRole("button", { name: "FULL METERS" }).click();
  await page.keyboard.press("KeyI");
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "FULL METERS" }).click();
  await page.keyboard.press("KeyO");
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "FULL METERS" }).click();
  await page.keyboard.press("KeyP");
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: "FULL METERS" }).click();
  await page.keyboard.press("Space");
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${out}/${id}-integrated-super.png` });
  await page.waitForTimeout(1500);
}
const video = page.video();
await context.close();
renameSync(await video.path(), out + "/gameplay.webm");
const bundled = await build({
  entryPoints: ["src/ai/cpu.ts"],
  bundle: true,
  format: "iife",
  globalName: "ReviewCPU",
  write: false,
  platform: "browser",
});
for (const [id, index] of [
  ["rob", 7],
  ["santa", 9],
]) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    recordVideo: { dir: out, size: { width: 960, height: 666 } },
  });
  await ctx.addInitScript(
    ({ index }) =>
      localStorage.setItem(
        "caf-save",
        JSON.stringify({
          version: 3,
          tutorial: true,
          campaign: { fighter: "nash", index, score: 9000, continues: 2 },
          settings: { muted: true },
        }),
      ),
    { index },
  );
  const p = await ctx.newPage();
  await boot(p);
  await click(p, "arcade");
  await click(p, "pick-nash");
  await click(p, "stages");
  await p.screenshot({ path: `${out}/${id}-level-preview.png` });
  await click(p, "start");
  await p.screenshot({ path: `${out}/${id}-introduction.png` });
  await p.addScriptTag({ content: bundled.outputFiles[0].text });
  await p.evaluate(() => {
    const bot = new window.ReviewCPU.CPU("master", 9),
      held = new Set();
    const codes = {
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
    const send = (type, code) =>
      document.body.dispatchEvent(
        new KeyboardEvent(type, { code, bubbles: true, cancelable: true }),
      );
    const run = () => {
      const s = window.__CAF__;
      if (s.screen !== "match") {
        for (const code of held) send("keyup", code);
        return;
      }
      const input = bot.input(s.match, 0),
        next = new Set();
      for (const [key, code] of Object.entries(codes))
        if (input[key]) next.add(code);
      for (const code of held) if (!next.has(code)) send("keyup", code);
      for (const code of next) if (!held.has(code)) send("keydown", code);
      held.clear();
      for (const code of next) held.add(code);
      requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
  });
  for (const phase of id === "santa" ? [1, 2] : [1]) {
    await p.waitForFunction(
      (phase) =>
        window.__CAF__.match.fighters[1].bossPhase >= phase ||
        window.__CAF__.screen === "results",
      phase,
      { timeout: 120000 },
    );
    await p.screenshot({ path: `${out}/${id}-phase-${phase + 1}.png` });
  }
  await p.waitForFunction(() => window.__CAF__.screen === "results", null, {
    timeout: 150000,
  });
  await p.screenshot({ path: `${out}/${id}-result.png` });
  bossResults.push(
    await p.evaluate(() => ({
      opponent: window.__CAF__.match.fighters[1].id,
      winner: window.__CAF__.match.winner,
      phase: window.__CAF__.match.fighters[1].bossPhase,
      unlocked: JSON.parse(localStorage.getItem("caf-save")).unlocked,
    })),
  );
  const v = p.video();
  await ctx.close();
  renameSync(await v.path(), `${out}/${id}-boss.webm`);
}
const mobile = await browser.newContext({
  ...devices["Pixel 7"],
  viewport: { width: 915, height: 412 },
});
const phone = await mobile.newPage();
await boot(phone);
await phone.screenshot({ path: out + "/mobile-menu.png" });
await click(phone, "training");
await phone.screenshot({ path: out + "/locked-roster.png" });
await click(phone, "pick-bucket");
await click(phone, "stages");
await click(phone, "start");
await phone.getByRole("button", { name: "GOT IT." }).click();
await fight(phone);
await phone.screenshot({ path: out + "/mobile-controls.png" });
await phone.locator("#pause-button").click();
await click(phone, "settings");
await phone.locator("#compact-controls").check();
await phone.locator("#left-handed").check();
await phone.getByRole("button", { name: "DONE" }).click();
await click(phone, "resume");
await phone.screenshot({ path: out + "/mobile-left-handed.png" });
await mobile.close();
writeFileSync(
  out + "/capture.json",
  JSON.stringify(
    {
      build: buildId,
      url,
      errors,
      bossResults,
      note: "Silent real-time recordings of actual production gameplay. Training review uses a declared unlocked-roster fixture and the visible FULL METERS control. Boss review starts from declared saved levels 8/10 and drives a seeded CPU player through actual keyboard events. No health/timer/winner mutation or accelerated simulation. The separate earned-championship screenshot comes from the ten-bout automated browser test.",
    },
    null,
    2,
  ) + "\n",
);
await browser.close();
if (errors.length) throw Error(errors.join("\n"));
