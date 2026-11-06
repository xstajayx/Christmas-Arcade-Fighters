import { it, expect } from "vitest";
import {
  createMatch,
  step,
  pushbox,
  separateFighters,
  hurtbox,
  overlaps,
  activeHitbox,
} from "../src/combat/engine";
import { roster, fighterById, getMove } from "../src/fighters/data";
import { animationFrame } from "../src/animation/clips";
const run = (m: ReturnType<typeof createMatch>, ticks: number) => {
  for (let i = 0; i < ticks; i++) step(m, [{}, {}]);
};
it("grounded pushboxes preserve side order including fast corner pressure", () => {
  for (const corner of [45, 680]) {
    const m = createMatch("nash", "bucket", true);
    run(m, 100);
    m.fighters[0].x = corner;
    m.fighters[1].x = corner + 67;
    for (let i = 0; i < 300; i++) {
      step(m, [
        { right: true, dash: true },
        { left: true, dash: true },
      ]);
      expect(m.fighters[0].x).toBeLessThan(m.fighters[1].x);
      expect(overlaps(pushbox(m.fighters[0]), pushbox(m.fighters[1]))).toBe(
        false,
      );
      expect(m.fighters.every((f) => f.x >= 45 && f.x <= 755)).toBe(true);
    }
  }
});
it("each fighter punches at non-overlapping body distance, kicks reach farther and whiffs beyond reach", () => {
  for (const def of roster) {
    const m = createMatch(def.id, "jamie", true);
    run(m, 100);
    const [a, b] = m.fighters;
    a.x = 300;
    b.x = 423;
    a.state = "attack";
    a.move = "punch";
    a.frame = getMove(def.id, "punch").startup;
    expect(overlaps(pushbox(a), pushbox(b))).toBe(false);
    expect(overlaps(activeHitbox(a)!, hurtbox(b))).toBe(true);
    const punch = activeHitbox(a)!;
    a.move = "kick";
    a.frame = getMove(def.id, "kick").startup;
    expect(activeHitbox(a)!.w).toBeGreaterThan(punch.w);
    b.x = 500;
    expect(overlaps(activeHitbox(a)!, hurtbox(b))).toBe(false);
    a.facing = -1;
    b.x = 177;
    expect(overlaps(activeHitbox(a)!, hurtbox(b))).toBe(true);
  }
});
it("SP1 and SP2 retain identity in every direction for every playable fighter", () => {
  for (const def of roster)
    for (const key of ["special", "special2"] as const)
      for (const direction of [
        {},
        { down: true },
        { up: true },
        { left: true },
        { right: true },
      ]) {
        const m = createMatch(def.id, "jamie", true);
        run(m, 100);
        m.fighters[0].meter = 100;
        step(m, [{ ...direction, [key]: true }, {}]);
        expect(m.fighters[0].move).toBe(key);
        expect(getMove(def.id, key).kind).toBe(
          key === "special" ? "dash" : "projectile",
        );
      }
});
it("walk poses advance by travelled distance and stay planted at a blocked wall", () => {
  const m = createMatch("jamie", "nash", true);
  run(m, 100);
  const f = m.fighters[0];
  f.state = "walk";
  f.walkDistance = 0;
  const start = animationFrame(f);
  f.animTick += 100;
  expect(animationFrame(f)).toBe(start);
  f.walkDistance = 22;
  expect(animationFrame(f)).not.toBe(start);
  f.x = 45;
  for (let i = 0; i < 40; i++) step(m, [{ left: true }, {}]);
  const distance = f.walkDistance;
  for (let i = 0; i < 40; i++) step(m, [{ left: true }, {}]);
  expect(f.walkDistance).toBe(distance);
});
it("a normal combo plus special cannot defeat a full-health fighter", () => {
  for (const f of roster) {
    const hp = fighterById(f.id).health;
    expect(hp).toBeGreaterThan(1000);
    const worst =
      getMove(f.id, "punch").damage +
      getMove(f.id, "kick").damage +
      getMove(f.id, "heavyPunch").damage +
      getMove(f.id, "special").damage;
    expect(worst * f.power * 1.2).toBeLessThan(hp * 0.4);
  }
});

import { AnnouncementGate } from "../src/audio/announcements";
it("announcer rejects chatter during priority calls and invalidates stale decodes", () => {
  const gate = new AnnouncementGate();
  const first = gate.reserve("combo", 0)!;
  expect(gate.reserve("combo", 300)).toBeNull();
  const ko = gate.reserve("knockout", 400)!;
  expect(gate.current(first)).toBe(false);
  expect(gate.current(ko)).toBe(true);
  expect(gate.reserve("counter", 600)).toBeNull();
  expect(gate.reserve("knockout", 1700)).toBeNull();
  expect(gate.reserve("fight", 3000)).not.toBeNull();
});

it("debug pushbox vertical bounds match the engine separation rule", () => {
  for (const gap of [64, 65]) {
    const m = createMatch("jamie", "nash", true);
    const [a, b] = m.fighters;
    a.x = 300;
    b.x = 350;
    a.y = 300 - gap;
    b.y = 300;
    const contact = overlaps(pushbox(a), pushbox(b));
    expect(contact).toBe(gap === 64);
    separateFighters(a, b, 1);
    expect(b.x - a.x > 50).toBe(contact);
  }
});
