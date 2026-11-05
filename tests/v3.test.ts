import { it, expect } from "vitest";
import { makeFighter } from "../src/combat/engine";
import {
  initialFraming,
  targetFraming,
  followFraming,
} from "../src/camera/framing";
import { isolateFrame } from "../src/art/frames";
it("frames discard disconnected neighbouring limbs and anchor the body at the feet", () => {
  const w = 192,
    h = 256,
    data = new Uint8ClampedArray(w * h * 4);
  for (let y = 20; y <= 240; y++)
    for (let x = 60; x <= 110; x++) data[(y * w + x) * 4 + 3] = 255;
  for (let y = 220; y < 245; y++)
    for (let x = 183; x < 192; x++) data[(y * w + x) * 4 + 3] = 255;
  const out = isolateFrame(data, w, h, 86);
  expect(out.bounds.y + out.bounds.h - 1).toBe(244);
  expect(out.pivot).toEqual({ x: 128, y: 244 });
  expect(out.pixels[(244 * 256 + 230) * 4 + 3]).toBe(0);
});
it("camera starts closer and fits separated fighters, jumps and both corners", () => {
  expect(initialFraming().zoom).toBe(1.25);
  for (const [ax, bx, ay, by] of [
    [245, 555, 300, 300],
    [45, 755, 300, 300],
    [45, 180, 190, 300],
    [650, 755, 300, 180],
  ]) {
    const a = makeFighter("jamie", ax, 1),
      b = makeFighter("bucket", bx, -1);
    a.y = ay;
    b.y = by;
    const c = targetFraming([a, b]);
    expect(c.zoom).toBeGreaterThanOrEqual(0.82);
    expect(c.zoom).toBeLessThanOrEqual(1.28);
    for (const f of [a, b]) {
      expect(f.x - 75).toBeGreaterThanOrEqual(c.x - 400 / c.zoom - 1);
      expect(f.x + 75).toBeLessThanOrEqual(c.x + 400 / c.zoom + 1);
      expect(f.y - 140).toBeGreaterThanOrEqual(c.y - 225 / c.zoom - 1);
      expect(f.y + 50).toBeLessThanOrEqual(c.y + 225 / c.zoom + 1);
    }
  }
});
it("camera contraction is gradual and independent of frame cadence", () => {
  const a = initialFraming(),
    t = { x: 450, y: 230, zoom: 1.28 };
  const once = followFraming(a, t, 32),
    twice = followFraming(followFraming(a, t, 16), t, 16);
  expect(once.x).toBeCloseTo(twice.x);
  expect(once.zoom).toBeCloseTo(twice.zoom);
});

import { createMatch, step, GROUND } from "../src/combat/engine";
const ready = () => {
  const m = createMatch("jamie", "nash");
  m.phase = "fight";
  m.fighters[0].x = 350;
  m.fighters[1].x = 390;
  return m;
};
it("a throw links both bodies before delayed damage, then releases into knockdown", () => {
  const m = ready(),
    hp = m.fighters[1].health;
  for (let n = 0; n < 8; n++) step(m, [{ grab: true }, {}]);
  expect(m.throwSequence).not.toBeNull();
  expect(m.fighters[1].health).toBe(hp);
  expect(m.fighters[1].state).toBe("thrown");
  for (let n = 0; n < 13; n++) step(m, [{}, {}]);
  expect(m.fighters[1].y).toBeLessThan(GROUND);
  for (let n = 0; n < 20; n++) step(m, [{}, {}]);
  expect(m.throwSequence).toBeNull();
  expect(m.fighters[1].health).toBeLessThan(hp);
  expect(m.fighters[1].throwImmunity).toBeGreaterThan(0);
});
it("throws whiff out of range and a defender can break a fresh hold", () => {
  const far = ready();
  far.fighters[1].x = 600;
  for (let n = 0; n < 60; n++) step(far, [{ grab: true }, {}]);
  expect(far.throwSequence).toBeNull();
  expect(far.fighters[0].state).toBe("idle");
  const m = ready();
  for (let n = 0; n < 8; n++) step(m, [{ grab: true }, {}]);
  step(m, [{}, { grab: true }]);
  expect(m.throwSequence).toBeNull();
  expect(m.events.some((e) => e.type === "throwBreak")).toBe(true);
  expect(m.fighters[1].health).toBe(118);
});
it("away walks outside a threat; low and overhead guards obey directional rules", () => {
  const m = ready();
  step(m, [{ left: true }, {}]);
  expect(m.fighters[0].state).toBe("walk");
  expect(m.fighters[0].x).toBeLessThan(350);
  for (const [attack, guard, blocked] of [
    [{ down: true, punch: true }, { right: true }, false],
    [{ down: true, punch: true }, { right: true, down: true }, true],
    [{ heavy: true, kick: true }, { right: true, down: true }, false],
  ] as const) {
    const x = ready();
    for (let n = 0; n < 35; n++) step(x, [attack, guard]);
    expect(x.fighters[1].health === 117).toBe(blocked);
  }
});

import { route, newCampaign, advance } from "../src/progression/campaign";
import {
  defaults,
  loadSave,
  awardCampaignVictory,
  persist,
} from "../src/config/storage";
import { fighterById, getMove } from "../src/fighters/data";
import { vi } from "vitest";
import { requestGameFullscreen } from "../src/ui/fullscreen";
it("the requested ten-level route places Rob at 8, Frost at 9 and three-phase Santa last", () => {
  const path = route("jamie");
  expect(path).toHaveLength(10);
  expect(
    path.slice(0, 7).every((x) => !x.boss && x.profile === "standard"),
  ).toBe(true);
  expect(new Set(path.slice(0, 7).map((x) => x.style)).size).toBe(7);
  expect(path.slice(7).map((x) => x.opponent)).toEqual([
    "rob",
    "frost",
    "santa",
  ]);
  const c = newCampaign("jamie");
  for (let n = 0; n < 9; n++) advance(c, true, 100);
  expect(c.completed).toBe(false);
  advance(c, true, 100);
  expect(c.completed).toBe(true);
});
it("boss victories unlock balanced identities persistently and award the final badge", () => {
  let stored = "";
  vi.stubGlobal("localStorage", {
    getItem: () => stored,
    setItem: (_key: string, value: string) => (stored = value),
  });
  const s = defaults(),
    c = newCampaign("bucket", 6);
  expect(awardCampaignVictory(s, c)).toBeNull();
  c.index = 7;
  expect(awardCampaignVictory(s, c)).toBe("rob");
  expect(awardCampaignVictory(s, c)).toBeNull();
  expect(s.unlocked).not.toContain("santa");
  c.index = 9;
  expect(awardCampaignVictory(s, c)).toBe("santa");
  persist(s);
  const restored = loadSave();
  expect(restored.unlocked).toContain("rob");
  expect(restored.unlocked).toContain("santa");
  expect(restored.badges).toContain("christmas-champion");
  expect(fighterById("rob").health).toBeLessThan(
    fighterById("rob", "boss").health,
  );
  expect(getMove("rob", "special2").armour).toBeUndefined();
  expect(getMove("rob", "special2", "boss").armour).toEqual([4, 10]);
});
it("migrates old Frost progress and preserves old scores without granting unearned new bosses", () => {
  vi.stubGlobal("localStorage", {
    getItem: () =>
      JSON.stringify({
        version: 2,
        progress: 5,
        arcadeWins: 1,
        settings: { keys: { block: "KeyL", punch: "KeyF" } },
        campaign: { fighter: "nash", index: 5, score: 4000, continues: 1 },
      }),
  });
  const s = loadSave();
  expect(s.version).toBe(3);
  expect(s.progress).toBe(8);
  expect(s.campaign).toMatchObject({ index: 8, score: 4000, continues: 1 });
  expect(s.unlocked).not.toContain("rob");
  expect(s.badges).toContain("legacy-champion");
  expect(s.settings.keys.block).toBeUndefined();
  expect(s.settings.keys.punch).toBe("KeyF");
});
it("Santa phases change readable projectile patterns and playable Santa has no boss phases", () => {
  const m = createMatch("jamie", "santa", false, "boss");
  m.phase = "fight";
  m.fighters[1].health = 90;
  step(m, [{}, {}]);
  expect(m.fighters[1].bossPhase).toBe(1);
  m.fighters[1].health = 40;
  step(m, [{}, {}]);
  expect(m.fighters[1].bossPhase).toBe(2);
  expect(getMove("santa", "special", "boss", 0).bursts).toBe(1);
  expect(getMove("santa", "special", "boss", 2).bursts).toBe(3);
  expect(getMove("santa", "special", "boss", 2).startup).toBeGreaterThanOrEqual(
    18,
  );
  const playable = createMatch("santa", "jamie");
  playable.phase = "fight";
  playable.fighters[0].health = 20;
  step(playable, [{}, {}]);
  expect(playable.fighters[0].bossPhase).toBe(0);
});
it("fullscreen handles unsupported and rejected browser APIs safely", async () => {
  expect(await requestGameFullscreen({} as HTMLElement)).toBe(false);
  expect(
    await requestGameFullscreen({
      requestFullscreen: () => Promise.reject(Error("denied")),
    } as unknown as HTMLElement),
  ).toBe(false);
});

it("wide signature frames retain full limbs with an explicit anchor offset", () => {
  const data = new Uint8ClampedArray(256 * 256 * 4);
  for (let y = 25; y <= 244; y++)
    for (let x = 20; x <= 250; x++) data[(y * 256 + x) * 4 + 3] = 255;
  const out = isolateFrame(data, 256, 256, 105);
  expect(out.bounds.x + out.bounds.w).toBeLessThanOrEqual(256);
  expect(out.bounds.w).toBe(231);
  expect(out.pivot.x).toBe(110);
});
it("a moving camera keeps corner bodies visible even while easing toward the midpoint", () => {
  let c = initialFraming();
  const a = makeFighter("jamie", 245, 1),
    b = makeFighter("bucket", 555, -1);
  for (let i = 0; i < 180; i++) {
    a.x = Math.max(45, 245 - i * 4);
    a.y = i < 40 ? 300 - i * 2 : i < 80 ? 220 + (i - 40) * 2 : 300;
    c = followFraming(c, targetFraming([a, b]), 16.67);
    for (const f of [a, b]) {
      expect(f.x - 90).toBeGreaterThanOrEqual(c.x - 400 / c.zoom - 1);
      expect(f.x + 90).toBeLessThanOrEqual(c.x + 400 / c.zoom + 1);
      expect(f.y - 135).toBeGreaterThanOrEqual(c.y - 225 / c.zoom - 1);
    }
  }
});
it("mid attacks can be guarded low, while an armoured boss charge can still be punished after its window", () => {
  const m = ready();
  m.fighters[1].previous = { right: true, down: true };
  for (let n = 0; n < 16; n++)
    step(m, [{ punch: true }, { right: true, down: true }]);
  expect(m.fighters[1].health).toBe(117);
  for (const [frame, reaction] of [
    [4, "attack"],
    [11, "hitstun"],
  ] as const) {
    const x = createMatch("jamie", "rob", false, "boss");
    x.phase = "fight";
    x.fighters[0].x = 350;
    x.fighters[1].x = 400;
    const [a, b] = x.fighters;
    a.state = "attack";
    a.move = "punch";
    a.frame = 5;
    b.state = "attack";
    b.move = "special2";
    b.frame = frame;
    step(x, [{}, {}]);
    expect(b.health).toBeLessThan(136);
    expect(b.state).toBe(reaction);
  }
});
it("throws remain inside corners and an airborne opponent is ineligible", () => {
  const m = ready();
  m.fighters[0].x = 710;
  m.fighters[1].x = 750;
  for (let n = 0; n < 70; n++) {
    step(m, [{ grab: n < 8 }, {}]);
    expect(m.fighters.every((f) => f.x >= 45 && f.x <= 755)).toBe(true);
  }
  expect(m.fighters[1].health).toBeLessThan(118);
  const air = ready();
  air.fighters[1].y = 200;
  air.fighters[1].vy = -3;
  for (let n = 0; n < 12; n++) step(air, [{ grab: true }, {}]);
  expect(air.throwSequence).toBeNull();
});

it("Santa Super delivers all four contacts and reserves launch/strong knockback for the finisher", () => {
  const m = createMatch("santa", "nash");
  m.phase = "fight";
  m.fighters[0].x = 350;
  m.fighters[1].x = 400;
  m.fighters[0].superMeter = 100;
  for (let n = 0; n < 140; n++) step(m, [{ super: true }, {}]);
  expect(m.fighters[0].combo).toBe(4);
  expect(m.fighters[1].x).toBeGreaterThan(435);
});

it("the major-boss checkpoint refills continues without exceeding the three-token cap", () => {
  const c = newCampaign("jamie", 7);
  c.continues = 1;
  advance(c, true, 100);
  expect(c.continues).toBe(3);
  expect(c.index).toBe(8);
  const full = newCampaign("jamie", 7);
  advance(full, true, 100);
  expect(full.continues).toBe(3);
});
