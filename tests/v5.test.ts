import { it, expect } from "vitest";
import {
  createMatch,
  step,
  activeHitbox,
  hurtbox,
  overlaps,
  GROUND,
} from "../src/combat/engine";
import { roster, getMove, fighterById } from "../src/fighters/data";
import { bodyWidths } from "../src/combat/balance";
import { strikeContact, torsoWidth } from "../src/combat/contact";
import { targetFraming, followFraming } from "../src/camera/framing";
import {
  validateHd,
  hdFrame,
  localArtPath,
  type HdClip,
} from "../src/animation/hd";
import { animationFrame } from "../src/animation/clips";
it("melee endpoints match the authored active fist/boot, mirror symmetrically and whiff outside contact tolerance", () => {
  for (const char of roster)
    for (const move of [
      "punch",
      "kick",
      "heavyPunch",
      "heavyKick",
      "grab",
    ] as const)
      for (const direction of [1, -1] as const) {
        const m = createMatch(char.id, "jamie", true),
          [a, b] = m.fighters;
        a.x = 400;
        a.facing = direction;
        a.state = "attack";
        a.move = move;
        a.frame = getMove(char.id, move).startup;
        const contact = strikeContact(char.id, move)!,
          box = activeHitbox(a)!;
        const end = direction === 1 ? box.x + box.w : box.x;
        expect((end - a.x) * direction).toBeCloseTo(contact.reach + 2);
        expect(box.y + box.h / 2).toBeCloseTo(a.y - contact.height);
        expect(
          getMove(char.id, move).range * fighterById(char.id).reach + 13,
        ).toBeCloseTo(contact.reach + 2);
        b.x = a.x + direction * (contact.reach + torsoWidth.jamie / 2 + 6);
        expect(overlaps(box, hurtbox(b))).toBe(false);
        b.x =
          a.x + direction * ((bodyWidths[char.id] + bodyWidths.jamie) / 2 + 1);
        expect(overlaps(box, hurtbox(b))).toBe(true);
      }
});
it("hit sparks originate in actual contact rather than the far side of a defender", () => {
  const m = createMatch("jamie", "beardy", true);
  m.phase = "fight";
  const [a, b] = m.fighters;
  a.x = 350;
  b.x = 450;
  a.state = "attack";
  a.move = "punch";
  a.frame = getMove(a.id, "punch").startup - 1;
  step(m, [{}, {}]);
  const e = m.events.find((e) => e.type === "hit")!;
  expect(e).toBeDefined();
  expect(e.x).toBeGreaterThanOrEqual(b.x - torsoWidth.beardy / 2);
  expect(e.x).toBeLessThan(b.x);
  expect(
    Math.abs(e.y - (a.y - strikeContact(a.id, "punch")!.height)),
  ).toBeLessThan(15);
});
it("camera makes close fighters larger and keeps opaque bounds out of HUD/control safe areas", () => {
  const m = createMatch("jamie", "beardy", true);
  m.fighters[0].x = 350;
  m.fighters[1].x = 450;
  const visuals = [
    { x: 305, y: 185, width: 110, height: 165 },
    { x: 395, y: 180, width: 112, height: 170 },
  ];
  const t = targetFraming(m.fighters, visuals);
  expect(t.zoom).toBeGreaterThan(1.4);
  expect((165 * t.zoom) / 450).toBeGreaterThan(0.5);
  const mobile = targetFraming(m.fighters, visuals, {
    top: 98,
    bottom: 132,
    left: 20,
    right: 20,
  });
  const c = followFraming({ x: 400, y: 240, zoom: 1.52 }, mobile, 16);
  for (const v of visuals) {
    expect((v.y - c.y) * c.zoom + 225).toBeGreaterThanOrEqual(98 - 1);
    expect((v.y + v.height - c.y) * c.zoom + 225).toBeLessThanOrEqual(
      450 - 132 + 1,
    );
  }
});
const clip: HdClip = {
  image: "characters/hd/jamie/punch.webp",
  size: [2048, 640],
  frames: [0, 1, 2, 3].map((n) => ({
    rect: [n * 512, 0, 512, 640],
    pivot: [256, 608],
    bounds: [80, 48, 352, 560],
    offset: [0, 0],
    ticks: 3,
    phase: n === 0 ? "startup" : n === 1 ? "active" : "recovery",
  })),
};
it("accepts HD crops, anchors, offsets and phase timing but rejects invalid sheets and incomplete attack cycles", () => {
  const m = () => ({
    version: 1,
    referenceHeight: 560,
    clips: { lightPunch: structuredClone(clip) },
  });
  expect(validateHd(m()).clips.lightPunch!.frames).toHaveLength(4);
  const crop = m();
  crop.clips.lightPunch.frames[0].rect[2] = 5000;
  expect(() => validateHd(crop)).toThrow();
  const origin = m();
  origin.clips.lightPunch.frames[0].pivot[1] = 900;
  expect(() => validateHd(origin)).toThrow();
  const phase = m();
  phase.clips.lightPunch.frames.forEach((f) => (f.phase = "startup"));
  expect(() => validateHd(phase)).toThrow();
  const huge = m();
  huge.clips.lightPunch.size = [4096, 4096];
  expect(() => validateHd(huge)).toThrow();
  expect(localArtPath("https://example.com/evil.png")).toBe(false);
  expect(localArtPath("characters/hd/../../evil")).toBe(false);
});
it("HD attack contact follows combat active frames and authored recovery, independent of idle clocks", () => {
  const f = createMatch("jamie", "beardy", true).fighters[0];
  f.state = "attack";
  f.move = "punch";
  f.animTick = 10000;
  const d = getMove(f.id, f.move);
  f.frame = 0;
  expect(hdFrame(f, clip)).toBe(0);
  f.frame = d.startup;
  expect(hdFrame(f, clip)).toBe(1);
  f.frame = d.startup + d.active;
  expect(hdFrame(f, clip)).toBe(2);
  f.frame = d.startup + d.active + d.recovery - 1;
  expect(hdFrame(f, clip)).toBe(3);
});
it("landing poses advance inside the actual short recovery without moving the floor", () => {
  const m = createMatch("jamie", "beardy", true);
  m.phase = "fight";
  const f = m.fighters[0];
  f.state = "landing";
  f.stun = 6;
  f.frame = 0;
  const frames = new Set<number>();
  for (let i = 0; i < 6; i++) {
    frames.add(animationFrame(f));
    step(m, [{}, {}]);
    expect(f.y).toBe(GROUND);
  }
  expect(frames.has(6)).toBe(true);
  expect(frames.has(31)).toBe(true);
  expect(frames.has(0)).toBe(true);
});
