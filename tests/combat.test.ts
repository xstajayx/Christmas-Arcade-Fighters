import { describe, it, expect } from "vitest";
import {
  createMatch,
  step,
  activeHitbox,
  GROUND,
  type Match,
  type Input,
} from "../src/combat/engine";
import { getMove, fighterById } from "../src/fighters/data";
import { CPU } from "../src/ai/cpu";
const run = (m: Match, n: number, a: Input = {}, b: Input = {}) => {
  for (let i = 0; i < n; i++) step(m, [a, b]);
};
const ready = () => {
  const m = createMatch("jamie", "nash");
  run(m, 100);
  m.fighters[0].x = 350;
  m.fighters[1].x = 400;
  return m;
};
describe("fixed-step combat", () => {
  it("waits for startup and applies each attack only once", () => {
    const m = ready(),
      hp = m.fighters[1].health;
    step(m, [{ punch: true }, {}]);
    expect(activeHitbox(m.fighters[0])).toBeNull();
    run(m, 5);
    expect(m.fighters[1].health).toBe(hp);
    run(m, 1);
    expect(m.fighters[1].health).toBeLessThan(hp);
    const after = m.fighters[1].health;
    run(m, 35, { punch: true });
    expect(m.fighters[1].health).toBe(after);
  });
  it("standing guard blocks high attacks and low guard blocks crouching attacks", () => {
    const m = ready(),
      hp = m.fighters[1].health;
    run(m, 20, { punch: true }, { right: true });
    expect(m.fighters[1].health).toBe(hp - 1);
    const low = ready();
    run(low, 25, { down: true, punch: true }, { right: true });
    expect(low.fighters[1].health).toBeLessThan(hp - 1);
    const guard = ready();
    run(guard, 25, { down: true, punch: true }, { right: true, down: true });
    expect(guard.fighters[1].health).toBe(hp - 1);
  });
  it("grabs defeat a guard at close range", () => {
    const m = ready();
    m.fighters[1].x = 390;
    run(m, 55, { grab: true }, { right: true });
    expect(m.fighters[1].health).toBeLessThan(fighterById("nash").health - 10);
    expect(m.fighters[1].state).toBe("knockdown");
  });
  it("specials require meter and spend the configured cost", () => {
    const m = ready();
    step(m, [{ special: true }, {}]);
    expect(m.fighters[0].move).toBeNull();
    m.fighters[0].meter = 80;
    step(m, [{}, {}]);
    step(m, [{ special: true }, {}]);
    expect(m.fighters[0].meter).toBe(40);
    expect(m.fighters[0].move).toBe("special");
    expect(getMove("nash", "special").dash).toBeGreaterThan(0);
    expect(getMove("bucket", "special").kind).toBe("projectile");
  });
  it("jumps, lands and cannot walk through boundaries", () => {
    const m = ready();
    run(m, 10, { up: true, left: true });
    expect(m.fighters[0].y).toBeLessThan(GROUND);
    run(m, 180, { left: true });
    expect(m.fighters[0].y).toBe(GROUND);
    expect(m.fighters[0].x).toBe(45);
  });
  it("resolves simultaneous punches as a trade", () => {
    const m = ready();
    run(m, 8, { punch: true }, { punch: true });
    expect(m.fighters[0].health).toBeLessThan(104);
    expect(m.fighters[1].health).toBeLessThan(fighterById("nash").health);
  });
  it("handles double KO and starts a fresh draw round", () => {
    const m = ready();
    m.fighters.forEach((f) => (f.health = 1));
    run(m, 8, { punch: true }, { punch: true });
    expect(m.phase).toBe("roundOver");
    expect(m.roundWinner).toBe("draw");
    run(m, 145);
    expect(m.round).toBe(2);
    expect(m.fighters[0].wins).toBe(0);
  });
  it("awards a best-of-three match and handles timeout by health percentage", () => {
    const m = ready();
    for (let round = 0; round < 2; round++) {
      m.fighters[1].health = 10;
      m.timer = 1;
      step(m, [{}, {}]);
      expect(m.roundWinner).toBe(0);
      run(m, 145);
      if (round === 0) run(m, 100);
    }
    expect(m.phase).toBe("matchOver");
    expect(m.winner).toBe(0);
  });
  it("timeouts with equal health are draws", () => {
    const m = ready();
    m.timer = 1;
    step(m, [{}, {}]);
    expect(m.roundWinner).toBe("draw");
  });
  it("training has no time limit and restores defeated fighters", () => {
    const m = createMatch("jamie", "bucket", true);
    run(m, 100);
    m.fighters[1].health = 0;
    step(m, [{}, {}]);
    expect(m.fighters[1].health).toBe(fighterById("bucket").health);
    expect(m.timer).toBe(5940);
  });
  it("is deterministic for identical recorded inputs", () => {
    const a = ready(),
      b = ready();
    for (let i = 0; i < 1000; i++) {
      const inputs: [Input, Input] = [
        { right: i % 30 < 10, punch: i % 35 === 0, up: i % 200 === 0 },
        { left: i % 25 < 9, kick: i % 43 === 0 },
      ];
      step(a, inputs);
      step(b, inputs);
    }
    expect(a).toEqual(b);
  });
  it("caps juggle contacts and allows recovery", () => {
    const m = ready();
    m.fighters[1].juggles = 3;
    m.fighters[1].y = 280;
    m.fighters[1].vy = -1;
    run(m, 9, { punch: true });
    expect(m.fighters[1].health).toBe(fighterById("nash").health);
  });
});
describe("CPU", () => {
  it("approaches from a distance and has difficulty-specific decision intervals", () => {
    const m = ready();
    m.fighters[1].x = 700;
    const cpu = new CPU("normal");
    expect(cpu.input(m).left).toBe(true);
    expect(new CPU("normal", 3).input(m)).toEqual(
      new CPU("normal", 3).input(m),
    );
  });
  it("can defeat an idle opponent without health or damage boosts", () => {
    const m = createMatch("jamie", "bucket"),
      cpu = new CPU("hard", 17);
    for (let i = 0; i < 30000 && m.phase !== "matchOver"; i++)
      step(m, [{}, cpu.input(m)]);
    expect(m.phase).toBe("matchOver");
    expect(m.winner).toBe(1);
  });
  it("implements training dummy choices", () => {
    const m = ready(),
      c = new CPU();
    expect(c.input(m, 1, "stand")).toEqual({});
    expect(c.input(m, 1, "block").right).toBe(true);
    expect(c.input(m, 1, "jump").up).toBeDefined();
  });
});
describe("combat protections", () => {
  it("interrupts a slow attack on hit and cancels its buffered move", () => {
    const m = ready();
    run(m, 8, { punch: true }, { kick: true });
    expect(m.fighters[1].state).toBe("hitstun");
    expect(m.fighters[1].move).toBeNull();
    expect(m.fighters[0].health).toBe(104);
  });
  it("requires a new input edge for a repeated attack", () => {
    const m = ready();
    run(m, 75, { punch: true });
    const score = m.fighters[0].score;
    run(m, 40, { punch: true });
    expect(m.fighters[0].score).toBe(score);
    step(m, [{}, {}]);
    m.fighters[0].x = m.fighters[1].x - 50;
    run(m, 20, { punch: true });
    expect(m.fighters[0].score).toBeGreaterThan(score);
  });
  it("preserves score, meter and round wins between rounds", () => {
    const m = ready();
    m.fighters[0].score = 450;
    m.fighters[0].meter = 80;
    m.fighters[1].health = 0;
    step(m, [{}, {}]);
    run(m, 145);
    expect(m.fighters[0].score).toBe(1450);
    expect(m.fighters[0].meter).toBe(80);
    expect(m.fighters[0].wins).toBe(1);
  });
  it("does not tick the clock during hitstop", () => {
    const m = ready();
    run(m, 7, { punch: true });
    expect(m.hitstop).toBeGreaterThan(0);
    const time = m.timer;
    step(m, [{}, {}]);
    expect(m.timer).toBe(time);
  });
  it("mirrors facing after crossing over in the air", () => {
    const m = ready();
    m.fighters[0].x = 430;
    m.fighters[0].y = 200;
    step(m, [{}, {}]);
    expect(m.fighters[0].facing).toBe(-1);
    expect(m.fighters[1].facing).toBe(1);
  });
  it("gains meter on contact without exceeding the cap", () => {
    const m = ready();
    m.fighters.forEach((f) => (f.meter = 99));
    run(m, 8, { punch: true });
    expect(m.fighters[0].meter).toBe(100);
    expect(m.fighters[1].meter).toBe(100);
  });
});
it("cannot guard during an attack even when away and attack are held", () => {
  const m = ready();
  run(m, 8, { punch: true, left: true }, { punch: true, right: true });
  expect(m.fighters[0].health).toBeLessThan(103);
  expect(m.fighters[1].health).toBeLessThan(fighterById("nash").health - 1);
});
