import { it, expect } from "vitest";
import {
  createMatch,
  step,
  resetRound,
  combatMove,
  LEFT,
  RIGHT,
  GROUND,
  type Input,
  type Match,
} from "../src/combat/engine";
import { roster, fighterById, getMove } from "../src/fighters/data";
import { activeSuper } from "../src/combat/presentation";
import { difficultyTuning } from "../src/combat/difficulty";
import { CPU } from "../src/ai/cpu";
import { targetFraming, followFraming } from "../src/camera/framing";
const ready = (difficulty: "easy" | "normal" = "normal", boss = false) => {
  const m = createMatch(
    "jamie",
    boss ? "santa" : "nash",
    true,
    boss ? "boss" : "standard",
    difficulty,
  );
  m.phase = "fight";
  m.fighters[0].x = 350;
  m.fighters[1].x = 472;
  return m;
};
const run = (m: Match, n: number, a: Input = {}, b: Input = {}) => {
  for (let i = 0; i < n; i++) step(m, [a, b]);
};
it("Super presentation disappears on finish, interrupt, KO, round, restart and scene exit", () => {
  const m = ready();
  const f = m.fighters[0];
  f.move = "super";
  f.state = "attack";
  expect(activeSuper(m)).toBe(f);
  f.state = "idle";
  expect(activeSuper(m)).toBeUndefined();
  f.state = "hitstun";
  expect(activeSuper(m)).toBeUndefined();
  f.state = "attack";
  m.fighters[1].health = 0;
  expect(activeSuper(m)).toBeUndefined();
  m.fighters[1].health = 100;
  for (const phase of ["roundOver", "matchOver", "intro"] as const) {
    m.phase = phase;
    expect(activeSuper(m)).toBeUndefined();
  }
  resetRound(m);
  expect(activeSuper(m)).toBeUndefined();
  expect(activeSuper(null)).toBeUndefined();
});
it("interruption cancels a stale cinematic freeze", () => {
  const m = ready();
  m.cinematic = 20;
  step(m, [{}, {}]);
  expect(m.cinematic).toBe(0);
});
it("only landed non-Super offense charges Super meter, including projectile and grab", () => {
  for (const action of [
    "punch",
    "kick",
    "special",
    "special2",
    "grab",
  ] as const) {
    const m = ready();
    m.fighters[0].meter = 100;
    run(m, 180, { [action]: true });
    expect(m.fighters[0].superMeter, action).toBe(10);
    expect(m.fighters[1].superMeter).toBe(0);
  }
  const m = ready();
  run(m, 7, { punch: true });
  step(m, [{ kick: true }, {}]);
  run(m, 70);
  expect(m.fighters[0].superMeter).toBe(20);
});
it("blocked contacts, received damage, waiting, walking and whiffs give no Super meter", () => {
  const m = ready();
  run(m, 60, { punch: true }, { right: true });
  expect(m.fighters.every((f) => f.superMeter === 0)).toBe(true);
  const miss = ready();
  miss.fighters[1].x = 740;
  run(miss, 60, { punch: true });
  run(miss, 30, { left: true });
  run(miss, 30);
  expect(miss.fighters.every((f) => f.superMeter === 0)).toBe(true);
});
it("every fully connected Super is stronger, hits only its configured count, spends once and never recharges", () => {
  for (const def of [...roster, fighterById("frost")]) {
    const m = createMatch(def.id, "nash", true);
    m.phase = "fight";
    m.fighters[0].x = 350;
    m.fighters[1].x = 472;
    m.fighters[0].superMeter = 100;
    const move = getMove(def.id, "super");
    const nominal = move.damage * def.power * (move.hits || 1);
    expect(nominal / 1200).toBeGreaterThanOrEqual(0.27);
    expect(nominal / 1200).toBeLessThanOrEqual(0.29);
    const hp = m.fighters[1].health;
    let hits = 0,
      activations = 0;
    for (let n = 0; n < 220; n++) {
      step(m, [{ super: true }, {}]);
      hits += m.events.filter((e) => e.type === "hit" && e.player === 0).length;
      activations += m.events.filter((e) => e.type === "super").length;
    }
    expect(hits, def.id).toBe(move.hits);
    expect(activations).toBe(1);
    expect(m.fighters[0].superMeter).toBe(0);
    expect(m.fighters[1].superMeter).toBe(0);
    expect(hp - m.fighters[1].health).toBeGreaterThan(
      getMove(def.id, "punch").damage,
    );
    expect(m.fighters[1].health).toBeGreaterThan(0);
  }
});
it("secondary projectiles attributed to a Super cannot generate Super meter", () => {
  const m = ready();
  m.projectiles.push({
    id: 1,
    owner: 0,
    x: 450,
    y: 200,
    vx: 5,
    w: 28,
    h: 28,
    life: 140,
    move: "super",
    style: "jamie",
    data: { ...getMove("jamie", "super"), kind: "projectile" },
  });
  const hp = m.fighters[1].health;
  run(m, 40);
  expect(m.fighters[1].health).toBeLessThan(hp);
  expect(m.fighters.every((f) => f.superMeter === 0)).toBe(true);
});
it("Easy scales CPU damage and boss health, preserves max health and leaves other levels unchanged", () => {
  const normal = ready("normal", true),
    easy = ready("easy", true);
  expect(easy.fighters[1].health).toBe(
    Math.round(normal.fighters[1].health * 0.85),
  );
  step(easy, [{}, {}]);
  expect(easy.fighters[1].bossPhase).toBe(0);
  for (const difficulty of ["normal", "hard", "master"] as const) {
    const m = createMatch("jamie", "rob", false, "boss", difficulty);
    expect(m.fighters[1].health).toBe(fighterById("rob", "boss").health);
  }
  const losses = [];
  for (const difficulty of ["normal", "easy"] as const) {
    const m = ready(difficulty);
    const hp = m.fighters[0].health;
    run(m, 50, {}, { punch: true });
    losses.push(hp - m.fighters[0].health);
  }
  expect(losses[1] / losses[0]).toBeGreaterThan(0.65);
  expect(losses[1] / losses[0]).toBeLessThan(0.75);
  resetRound(easy);
  expect(easy.fighters[1].health).toBe(easy.fighters[1].maxHealth);
  expect(easy.fighters[1].difficulty).toBe("easy");
});
it("Easy bosses telegraph attacks, reduce Santa bursts and expose long whiff recovery", () => {
  for (const id of ["rob", "santa"] as const) {
    const m = createMatch("jamie", id, true, "boss", "easy");
    m.phase = "fight";
    const boss = m.fighters[1];
    boss.bossPhase = 2;
    const heavy = combatMove(boss, "heavyPunch");
    expect(heavy.startup).toBeGreaterThan(
      getMove(id, "heavyPunch", "boss", 2).startup,
    );
    expect(heavy.recovery).toBeGreaterThan(
      getMove(id, "heavyPunch", "boss", 2).recovery,
    );
    if (id === "santa") expect(combatMove(boss, "special").bursts).toBe(1);
    const cpu = new CPU("easy", 19, id);
    boss.state = "attack";
    boss.move = "heavyPunch";
    cpu.input(m);
    boss.state = "idle";
    boss.move = null;
    m.tick++;
    for (let n = 0; n < 100; n++) {
      expect(cpu.input(m)).toEqual({});
      m.tick++;
    }
  }
  expect(difficultyTuning.easy.delay).toBeGreaterThan(
    difficultyTuning.normal.delay,
  );
});
it("Easy Santa does not repeatedly emit projectiles inside its cooldown", () => {
  const m = createMatch("jamie", "santa", true, "boss", "easy");
  m.phase = "fight";
  m.fighters[1].meter = 100;
  m.fighters[1].health = m.fighters[1].maxHealth * 0.3;
  const cpu = new CPU("easy", 41, "santa"),
    launches: number[] = [];
  for (let n = 0; n < 3000; n++) {
    step(m, [{}, cpu.input(m)]);
    if (m.events.some((e) => e.type === "projectile" && e.player === 1))
      launches.push(m.tick);
  }
  expect(launches.length).toBeGreaterThan(0);
  for (let n = 1; n < launches.length; n++)
    expect(launches[n] - launches[n - 1]).toBeGreaterThanOrEqual(150);
});
it("throws pull and release continuously in both directions and at both arena edges", () => {
  for (const [ax, bx] of [
    [350, 474],
    [474, 350],
    [LEFT + 124, LEFT],
    [RIGHT - 124, RIGHT],
  ]) {
    const m = ready();
    const [a, b] = m.fighters;
    a.x = ax;
    b.x = bx;
    a.facing = ax < bx ? 1 : -1;
    const hp = b.health;
    let hold = false,
      land = false;
    let priorX = b.x,
      priorY = b.y,
      maxJump = 0;
    for (let n = 0; n < 160; n++) {
      step(m, [n === 0 ? { grab: true } : {}, {}]);
      hold ||= !!m.throwSequence;
      maxJump = Math.max(
        maxJump,
        Math.abs(b.x - priorX),
        Math.abs(b.y - priorY),
      );
      priorX = b.x;
      priorY = b.y;
      land ||= m.events.some((e) => e.type === "landing" && e.player === 1);
      expect([a, b].every((f) => f.x >= LEFT && f.x <= RIGHT)).toBe(true);
    }
    expect(hold).toBe(true);
    expect(land).toBe(true);
    expect(maxJump).toBeLessThan(22);
    expect(b.health).toBeLessThan(hp);
    expect(b.y).toBe(GROUND);
    expect(b.state).toBe("idle");
  }
});
it("camera framing includes measured wide/low sprite bounds at both edges without changing normal framing", () => {
  for (const [ax, bx] of [
    [45, 200],
    [600, 755],
    [45, 755],
  ]) {
    const m = ready();
    m.fighters[0].x = ax;
    m.fighters[1].x = bx;
    const boxes = m.fighters.map((f) => ({
      x: f.x - 125,
      y: f.y - 160,
      width: 250,
      height: 220,
    }));
    const t = targetFraming(m.fighters, boxes),
      c = followFraming({ x: 400, y: 240, zoom: 1.28 }, t, 16);
    for (const box of boxes) {
      expect(box.x).toBeGreaterThanOrEqual(c.x - 400 / c.zoom);
      expect(box.x + box.width).toBeLessThanOrEqual(c.x + 400 / c.zoom);
      expect(box.y + box.height).toBeLessThanOrEqual(c.y + 225 / c.zoom);
    }
  }
});

it("a Super KO ends presentation immediately and restart clears cinematic state", () => {
  const m = ready();
  m.training = false;
  m.fighters[0].superMeter = 100;
  m.fighters[1].health = 40;
  step(m, [{ super: true }, {}]);
  expect(activeSuper(m)).toBeDefined();
  run(m, 120, { super: true });
  expect(m.phase).toBe("roundOver");
  expect(activeSuper(m)).toBeUndefined();
  resetRound(m);
  expect(m.cinematic).toBe(0);
  expect(activeSuper(m)).toBeUndefined();
});

import { isolateFrame, touchesCellEdge } from "../src/art/frames";
it("guarded gutter extraction retains connected wide limbs without taking neighbouring art", () => {
  const pixels = new Uint8ClampedArray(256 * 256 * 4);
  for (let y = 180; y < 231; y++)
    for (let x = 24; x <= 238; x++) pixels[(y * 256 + x) * 4 + 3] = 255;
  for (let y = 30; y < 80; y++)
    for (let x = 248; x < 256; x++) pixels[(y * 256 + x) * 4 + 3] = 255;
  const tight = new Uint8ClampedArray(192 * 256 * 4);
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 192; x++)
      tight[(y * 192 + x) * 4 + 3] = pixels[(y * 256 + x + 32) * 4 + 3];
  const clipped = isolateFrame(tight, 192, 256, 86);
  expect(touchesCellEdge(clipped, 192)).toBe(true);
  const full = isolateFrame(pixels, 256, 256, 118);
  expect(full.bounds.w).toBe(215);
  expect(full.pivot.x).toBe(128);
  expect(
    full.pixels.filter((_, i) => i % 4 === 3 && full.pixels[i] === 255).length,
  ).toBe(215 * 51);
  expect(full.bounds.x + full.bounds.w).toBeLessThanOrEqual(256);
});
