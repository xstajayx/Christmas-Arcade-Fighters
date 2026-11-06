import { test, expect, type Page } from "@playwright/test";
import type { Sound } from "../../src/audio/sound";
type Harness = { __AUDIO__: Sound };
const state = () => (window as unknown as Harness).__AUDIO__.diagnostics;
async function harness(page: Page, unlock = true) {
  await page.route("**/audio-harness", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: '<script type="module" src="/@vite/client"></script><button id="enable">Enable audio</button>',
    }),
  );
  await page.goto("/audio-harness");
  await page.evaluate(async () => {
    const path = "/src/audio/sound.ts";
    const { Sound } = await import(path);
    const sound = ((window as unknown as Harness).__AUDIO__ = new Sound());
    document.getElementById("enable")!.onclick = () => sound.unlock();
  });
  if (unlock) {
    await page.locator("#enable").click();
    await expect
      .poll(() => page.evaluate(state))
      .toMatchObject({ state: "running", playingTrack: "menu" });
    await page.evaluate(() =>
      (window as unknown as Harness).__AUDIO__.enterScene(),
    );
  }
}
test("gesture gating, priorities, critical queues, ducking and stale-decode cleanup", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const requested: string[] = [];
  page.on("request", (r) => requested.push(r.url()));
  await harness(page, false);
  expect((await page.evaluate(state)).state).toBe("locked");
  expect(requested.some((u) => u.includes("audio/music/"))).toBe(false);
  await page.locator("#enable").click();
  await expect
    .poll(() => page.evaluate(state))
    .toMatchObject({ state: "running", playingTrack: "menu" });
  await page.evaluate(async () => {
    const s = (window as unknown as Harness).__AUDIO__;
    s.enterScene();
    await s.announce("combo", "Combo!");
  });
  expect((await page.evaluate(state)).voice).toBe("combo");
  await page.evaluate(async () => {
    const s = (window as unknown as Harness).__AUDIO__;
    await s.announce("knockout", "Knockout!");
    void s.announce("first-hit", "First hit!");
    void s.announce("perfect", "Perfect!");
    void s.announce("you-win", "You win!");
  });
  const ko = await page.evaluate(state);
  expect(ko.voice).toBe("knockout");
  expect(ko.queued).toEqual(["perfect", "you-win"]);
  await expect
    .poll(async () => (await page.evaluate(state)).duck)
    .toBeLessThan(0.6);
  await expect
    .poll(async () => (await page.evaluate(state)).voice, {
      intervals: [20, 40, 80],
    })
    .toBe("you-win");
  await expect.poll(async () => (await page.evaluate(state)).voice).toBeNull();
  await expect
    .poll(async () => (await page.evaluate(state)).duck)
    .toBeGreaterThan(0.99);
  const cachedBefore = (await page.evaluate(state)).voiceCached;
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/voices/five-hit-combo.mp3*", async (r) => {
    await held;
    await r.continue();
  });
  const loading = page.waitForRequest((r) =>
    r.url().includes("five-hit-combo.mp3"),
  );
  await page.evaluate(() => {
    void (window as unknown as Harness).__AUDIO__.announce(
      "five-hit-combo",
      "Five hit combo!",
    );
  });
  await loading;
  await page.evaluate(() =>
    (window as unknown as Harness).__AUDIO__.enterScene(),
  );
  release();
  await expect
    .poll(async () => (await page.evaluate(state)).voiceCached)
    .toBeGreaterThan(cachedBefore);
  expect((await page.evaluate(state)).voice).toBeNull();
  expect(errors).toEqual([]);
});
test("music crossfades, phase continuity, pause, independent buses, mute and disposal", async ({
  page,
}) => {
  await harness(page);
  for (const track of ["village", "rob", "santa"] as const) {
    await page.evaluate(
      (track) => (window as unknown as Harness).__AUDIO__.setTrack(track),
      track,
    );
    await expect
      .poll(async () => (await page.evaluate(state)).playingTrack)
      .toBe(track);
    expect((await page.evaluate(state)).musicSources).toBeLessThanOrEqual(2);
  }
  const before = (await page.evaluate(state)).position;
  await page.evaluate(() =>
    (window as unknown as Harness).__AUDIO__.setTrack("santaFinal"),
  );
  await expect
    .poll(async () => (await page.evaluate(state)).playingTrack)
    .toBe("santaFinal");
  expect((await page.evaluate(state)).position).toBeGreaterThanOrEqual(before);
  await page.evaluate(() => {
    const s = (window as unknown as Harness).__AUDIO__;
    s.setIntensity(2);
    s.music = 0.15;
    s.effects = 0.35;
    s.announcer = 0.75;
    for (let i = 0; i < 30; i++) s.setTrack("santaFinal");
  });
  await expect
    .poll(async () => (await page.evaluate(state)).musicSources)
    .toBe(1);
  expect((await page.evaluate(state)).musicCached).toBeLessThanOrEqual(2);
  expect((await page.evaluate(state)).levels).toMatchObject({
    music: 0.15,
    effects: 0.35,
    announcer: 0.75,
  });
  expect((await page.evaluate(state)).intensity).toBe(2);
  await page.evaluate(() => (window as unknown as Harness).__AUDIO__.suspend());
  await expect
    .poll(async () => (await page.evaluate(state)).state)
    .toBe("suspended");
  const frozen = (await page.evaluate(state)).position;
  await page.waitForTimeout(100);
  expect((await page.evaluate(state)).position).toBe(frozen);
  await page.evaluate(() => (window as unknown as Harness).__AUDIO__.resume());
  await expect
    .poll(async () => (await page.evaluate(state)).state)
    .toBe("running");
  await page.evaluate(() => {
    const s = (window as unknown as Harness).__AUDIO__;
    for (let i = 0; i < 50; i++) s.play("super");
  });
  expect((await page.evaluate(state)).effects).toBeLessThanOrEqual(24);
  await page.evaluate(() => {
    const s = (window as unknown as Harness).__AUDIO__;
    s.muted = true;
    s.play("projectile", undefined, "special2", "rob");
  });
  expect((await page.evaluate(state)).effects).toBe(0);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            (window as unknown as Harness).__AUDIO__ as unknown as {
              master: GainNode;
            }
          ).master.gain.value,
      ),
    )
    .toBe(0);
  await page.evaluate(() => {
    const s = (window as unknown as Harness).__AUDIO__;
    s.muted = false;
    s.dispose();
  });
  expect(await page.evaluate(state)).toMatchObject({
    musicSources: 0,
    effects: 0,
    voice: null,
    queued: [],
    musicCached: 0,
    voiceCached: 0,
  });
});
test("compressed decode fallbacks work and every original score has non-silent, bounded PCM", async ({
  page,
}) => {
  await page.route("**/music/menu.mp3*", (r) =>
    r.fulfill({ contentType: "audio/mpeg", body: "invalid codec fixture" }),
  );
  await page.route("**/voices/fight.mp3*", (r) =>
    r.fulfill({ contentType: "audio/mpeg", body: "invalid codec fixture" }),
  );
  const files: string[] = [];
  page.on("request", (r) => files.push(r.url()));
  await harness(page);
  await page.evaluate(async () => {
    const s = (window as unknown as Harness).__AUDIO__;
    await s.announce("fight", "Fight!");
  });
  expect(files.some((f) => f.includes("menu.ogg"))).toBe(true);
  expect(files.some((f) => f.includes("fight.wav"))).toBe(true);
  await page.unroute("**/music/menu.mp3*");
  await page.unroute("**/voices/fight.mp3*");
  const decoded = await page.evaluate(async () => {
    const manifest = await (await fetch("/audio/manifest.json")).json();
    const ctx = new OfflineAudioContext(1, 1, 32000),
      results = [];
    for (const track of manifest.tracks)
      for (const file of track.files) {
        const buffer = await ctx.decodeAudioData(
          await (await fetch("/audio/" + file)).arrayBuffer(),
        );
        const samples = buffer.getChannelData(0);
        let energy = 0,
          peak = 0;
        for (const x of samples) {
          energy += x * x;
          peak = Math.max(peak, Math.abs(x));
        }
        results.push({
          id: track.id,
          file,
          duration: buffer.duration,
          expected: track.duration,
          rms: Math.sqrt(energy / samples.length),
          peak,
          seam: Math.abs(samples[0] - samples[samples.length - 1]),
        });
      }
    return results;
  });
  expect(decoded).toHaveLength(26);
  for (const clip of decoded) {
    expect(clip.duration, clip.file).toBeCloseTo(clip.expected, 1);
    expect(clip.rms, clip.file).toBeGreaterThan(0.025);
    expect(clip.peak, clip.file).toBeLessThan(0.98);
    expect(clip.seam, clip.file).toBeLessThan(0.2);
  }
  const voices = await page.evaluate(async () => {
    const manifest = await (await fetch("/voices/manifest.json")).json();
    const ctx = new OfflineAudioContext(1, 1, 22050),
      results = [];
    for (const clip of manifest.clips) {
      const buffer = await ctx.decodeAudioData(
        await (await fetch("/voices/" + clip.compressed)).arrayBuffer(),
      );
      let peak = 0,
        energy = 0;
      const data = buffer.getChannelData(0);
      for (const x of data) {
        peak = Math.max(peak, Math.abs(x));
        energy += x * x;
      }
      results.push({
        id: clip.id,
        duration: buffer.duration,
        peak,
        rms: Math.sqrt(energy / data.length),
      });
    }
    return results;
  });
  expect(voices).toHaveLength(36);
  for (const clip of voices) {
    expect(clip.duration, clip.id).toBeGreaterThan(0.2);
    expect(clip.rms, clip.id).toBeGreaterThan(0.03);
    expect(clip.peak, clip.id).toBeLessThan(0.98);
  }
});
test("real menu/stage hooks unlock audio, pause/resume and exit without duplicate tracks", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  const mix = () =>
    (
      window as unknown as {
        __CAF__: { rendering: { audioMix: ReturnType<typeof state> } };
      }
    ).__CAF__.rendering.audioMix;
  await expect(
    page.getByRole("button", { name: "TRAINING", exact: true }),
  ).toBeVisible();
  expect((await page.evaluate(mix)).state).toBe("locked");
  await page.getByRole("button", { name: "TRAINING", exact: true }).click();
  await page.getByRole("button", { name: "CHOOSE STAGE" }).click();
  await page.locator('[data-action="stage-6"]').click();
  await page.getByRole("button", { name: "START FIGHT" }).click();
  await page.getByRole("button", { name: "GOT IT." }).click();
  await expect
    .poll(async () => (await page.evaluate(mix)).playingTrack)
    .toBe("rob");
  await page.locator("#pause-button").click();
  await expect
    .poll(async () => (await page.evaluate(mix)).state)
    .toBe("suspended");
  await page.locator('[data-action="resume"]').click();
  await expect
    .poll(async () => (await page.evaluate(mix)).state)
    .toBe("running");
  await page.locator("#pause-button").click();
  await page.locator('[data-action="quit"]').click();
  await expect
    .poll(async () => (await page.evaluate(mix)).playingTrack)
    .toBe("menu");
  await expect
    .poll(async () => (await page.evaluate(mix)).musicSources)
    .toBe(1);
  expect(errors).toEqual([]);
});
