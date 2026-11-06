import { it, expect } from "vitest";
import { groundContacts } from "../src/art/frames";
import { stageFloor, stageLayout, stageSource } from "../src/art/stages";
import { createMatch, step, GROUND, LEFT, RIGHT } from "../src/combat/engine";
import { getMove, fighterById } from "../src/fighters/data";
import { animationFrame } from "../src/animation/clips";
it("all authored floor cuts map to the existing ground baseline, without discarded or repeated rows", () => {
  for (let stage = 0; stage < 8; stage++) {
    const source = stageSource(stage),
      floor = stageFloor(stage),
      cut = Math.round(source.h * floor.source);
    expect(cut).toBeGreaterThan(0);
    expect(cut + (source.h - cut)).toBe(source.h);
    const worldY =
      stageLayout.y -
      stageLayout.height / 2 +
      (floor.target / 450) * stageLayout.height;
    expect(Math.abs(worldY - (GROUND + 50))).toBeLessThan(0.1);
  }
});
it("contact shadows use both opaque soles and reject transparent padding/fringe", () => {
  const pixels = new Uint8ClampedArray(256 * 256 * 4);
  for (const [left, width] of [
    [40, 20],
    [160, 26],
  ])
    for (let x = left; x < left + width; x++)
      for (let y = 240; y <= 244; y++) pixels[(y * 256 + x) * 4 + 3] = 255;
  pixels[(244 * 256 + 128) * 4 + 3] = 32;
  expect(groundContacts(pixels, 244)).toEqual([
    { x: 50, width: 20 },
    { x: 173, width: 26 },
  ]);
});
it("throw wind-up preserves release position, damage, velocity and grounding in both directions and at arena edges", () => {
  for (const [ax, bx] of [
    [350, 474],
    [474, 350],
    [LEFT + 124, LEFT],
    [RIGHT - 124, RIGHT],
  ]) {
    const m = createMatch("jamie", "nash", true);
    m.phase = "fight";
    const [a, b] = m.fighters;
    a.x = ax;
    b.x = bx;
    const direction = ax < bx ? 1 : -1;
    a.facing = direction;
    const hp = b.health;
    let releases = 0,
      landed = false,
      priorX = b.x;
    for (let tick = 0; tick < 180; tick++) {
      step(m, [tick === 0 ? { grab: true } : {}, {}]);
      expect(Math.abs(b.x - priorX)).toBeLessThan(22);
      priorX = b.x;
      const release = m.events.find((e) => e.type === "throw");
      if (release) {
        releases++;
        expect(release.x).toBe(
          Math.max(LEFT, Math.min(RIGHT, ax + direction * 40)),
        );
        expect(b.vy).toBeCloseTo(-6.2 + 0.43);
        expect(b.vx).toBeCloseTo(direction * 7 * 0.97);
        expect(animationFrame(b)).toBe(23);
        expect(animationFrame(a)).toBe(13);
      }
      landed ||= m.events.some((e) => e.type === "landing" && e.player === 1);
    }
    expect(releases).toBe(1);
    expect(landed).toBe(true);
    expect(hp - b.health).toBe(
      Math.round(getMove("jamie", "grab").damage * fighterById("jamie").power),
    );
    expect(b.y).toBe(GROUND);
    expect(b.state).toBe("idle");
  }
});
