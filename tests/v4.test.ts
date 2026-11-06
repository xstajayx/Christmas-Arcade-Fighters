import { describe, it, expect } from "vitest";
import {
  createMatch,
  step,
  directionalGuard,
  GROUND,
  LEFT,
  RIGHT,
  type Match,
  type Input,
} from "../src/combat/engine";
import { balance } from "../src/combat/balance";
import { getMove, roster } from "../src/fighters/data";
import { animationFrame } from "../src/animation/clips";
import { motionPhase, renderPosition } from "../src/animation/motion";
const ready = () => {
  const m = createMatch("jamie", "beardy", true);
  m.phase = "fight";
  m.fighters[0].x = 350;
  m.fighters[1].x = 471;
  return m;
};
const run = (m: Match, ticks: number, a: Input = {}, b: Input = {}) => {
  for (let i = 0; i < ticks; i++) step(m, [a, b]);
};
function launch(m: Match) {
  step(m, [{ punch: true, heavy: true }, {}]);
  for (let i = 0; i < 30 && m.fighters[1].state !== "airHit"; i++)
    step(m, [{}, {}]);
  expect(m.fighters[1].state).toBe("airHit");
}
describe("V4 shared movement and airborne combat", () => {
  it("has deterministic neutral, forward and backward arcs; held jump never double jumps", () => {
    for (const direction of [{}, { right: true }, { left: true }]) {
      const m = ready(),
        f = m.fighters[0],
        start = f.x;
      m.fighters[1].x = RIGHT;
      let jumps = 0,
        landings = 0,
        apex = GROUND,
        landingTick = 0;
      for (let t = 0; t < 100; t++) {
        step(m, [{ up: true, ...direction }, {}]);
        jumps += m.events.filter(
          (e) => e.type === "jump" && e.player === 0,
        ).length;
        landings += m.events.filter(
          (e) => e.type === "landing" && e.player === 0,
        ).length;
        apex = Math.min(apex, f.y);
        if (!landingTick && landings) landingTick = t;
        if (!landings && t > 0)
          expect(f.vy).toBeCloseTo(
            -balance.jumpImpulse + (t + 1) * balance.gravity,
          );
      }
      expect(jumps).toBe(1);
      expect(landings).toBe(1);
      expect(apex).toBeGreaterThan(180);
      expect(apex).toBeLessThan(200);
      expect(landingTick).toBeGreaterThan(40);
      expect(landingTick).toBeLessThan(48);
      expect(f.y).toBe(GROUND);
      if ("right" in direction) expect(f.x - start).toBeGreaterThan(150);
      else if ("left" in direction) expect(start - f.x).toBeGreaterThan(150);
      else expect(f.x).toBe(start);
    }
  });
  it("keeps momentum during distinct jump punch and jump kick, with landing recovery", () => {
    for (const action of ["punch", "kick"] as const) {
      const m = ready(),
        f = m.fighters[0];
      step(m, [{ up: true, left: true, [action]: true }, {}]);
      expect(f.move).toBe(action === "punch" ? "airPunch" : "air");
      const x = f.x;
      run(m, 8, { left: true });
      expect(f.x).toBeLessThan(x - 25);
      expect(f.y).toBeLessThan(GROUND);
      let landed = false;
      for (let i = 0; i < 60; i++) {
        step(m, [{}, {}]);
        if (m.events.some((e) => e.type === "landing" && e.player === 0)) {
          landed = true;
          expect(f.state).toBe("landing");
          expect(f.stun).toBeGreaterThan(0);
          break;
        }
      }
      expect(landed).toBe(true);
      run(m, 10);
      expect(f.state).toBe("idle");
    }
  });
  it("Jamie uppercuts Beardy, jump-cancels during hitstop, follows with an air punch, then both recover", () => {
    const m = ready(),
      [a, b] = m.fighters;
    launch(m);
    expect(b.vy).toBe(-getMove("jamie", "heavyPunch").launch!);
    expect(b.juggles).toBe(1);
    step(m, [{ up: true, right: true }, {}]); // Buffer during hitstop, not after it.
    while (m.hitstop > 0) step(m, [{ right: true }, {}]);
    step(m, [{ right: true }, {}]);
    expect(a.state).toBe("jump");
    expect(a.y).toBeLessThan(GROUND);
    run(m, 6, { right: true });
    step(m, [{ right: true, punch: true }, {}]);
    const hp = b.health;
    let follow = false;
    for (let i = 0; i < 14; i++) {
      step(m, [{ right: true }, {}]);
      follow ||= m.events.some(
        (e) => e.type === "hit" && e.move === "airPunch",
      );
    }
    expect(follow).toBe(true);
    expect(b.health).toBeLessThan(hp);
    expect(b.juggles).toBe(2);
    expect(b.stun).toBeLessThanOrEqual(balance.maxAirHitstun);
    let down = false;
    for (let i = 0; i < 130; i++) {
      step(m, [{}, {}]);
      down ||= b.state === "knockdown" && b.y === GROUND;
    }
    expect(down).toBe(true);
    expect(a.state).toBe("idle");
    expect(b.state).toBe("idle");
    expect(b.juggles).toBe(0);
    expect(b.y).toBe(GROUND);
  });
  it("clears airborne state on a training KO and lands a launched round-ending KO", () => {
    const training = ready();
    const victim = training.fighters[1];
    victim.health = 1;
    victim.juggles = 2;
    step(training, [{ heavy: true, punch: true }, {}]);
    run(training, 14);
    expect(victim.health).toBe(victim.maxHealth);
    expect(victim.juggles).toBe(0);
    expect(victim.airborneKnockdown).toBe(false);
    expect(victim.vx).toBe(0);
    const round = ready();
    round.training = false;
    round.fighters[1].health = 1;
    step(round, [{ heavy: true, punch: true }, {}]);
    run(round, 14);
    expect(round.phase).toBe("roundOver");
    expect(round.fighters[1].y).toBeLessThan(GROUND);
    run(round, 90);
    expect(round.fighters[1].y).toBe(GROUND);
    expect(round.fighters[1].state).toBe("defeat");
  });
  it("rejects ground grabs during a jump instead of freezing a throw in midair", () => {
    const m = ready();
    step(m, [{ up: true, grab: true }, {}]);
    expect(m.fighters[0].state).toBe("jump");
    expect(m.fighters[0].move).toBeNull();
    run(m, 90);
    expect(m.throwSequence).toBeNull();
    expect(m.fighters[0].state).toBe("idle");
  });
  it("applies shared projectile juggle caps, scaling and forced recovery, including Easy CPUs", () => {
    for (const easy of [false, true]) {
      const m = ready(),
        [a, b] = m.fighters;
      a.difficulty = easy ? "easy" : "normal";
      b.y = 200;
      b.state = "airHit";
      b.airborneKnockdown = true;
      b.vy = -2;
      b.stun = 20;
      const damages: number[] = [];
      for (let hit = 0; hit < 5; hit++) {
        m.hitstop = 0;
        const hp = b.health;
        m.projectiles.push({
          id: ++m.nextProjectile,
          owner: 0,
          x: b.x,
          y: b.y - 80,
          vx: 0,
          w: 28,
          h: 28,
          life: 1,
          move: "special2",
          data: getMove("jamie", "special2"),
          style: "jamie",
        });
        m.projectiles.at(-1)!.life = 2;
        step(m, [{}, {}]);
        if (b.health < hp) damages.push(hp - b.health);
      }
      expect(damages).toHaveLength(
        easy ? balance.easyJuggleHits : balance.maxJuggles,
      );
      for (let i = 1; i < damages.length; i++)
        expect(damages[i]).toBeLessThan(damages[i - 1]);
      run(m, 180);
      expect(b.y).toBe(GROUND);
      expect(b.state).toBe("idle");
    }
  });
  it("does not turn a normal punch into a full relaunch", () => {
    const m = ready(),
      [a, b] = m.fighters;
    b.state = "airHit";
    b.airborneKnockdown = true;
    b.y = 250;
    b.vy = 4;
    b.juggles = 1;
    b.stun = 10;
    a.state = "attack";
    a.move = "punch";
    a.frame = getMove("jamie", "punch").startup - 1;
    step(m, [{}, {}]);
    expect(b.juggles).toBe(2);
    expect(b.vy).toBe(-balance.juggleLift);
    expect(b.health).toBeLessThan(b.maxHealth);
  });
  it("keeps guard directional and height-sensitive, with no actions during blockstun", () => {
    const m = ready(),
      [a, b] = m.fighters;
    b.previous = { right: true };
    expect(directionalGuard(b, a, getMove(a.id, "punch"))).toBe(true);
    expect(directionalGuard(b, a, getMove(a.id, "low"))).toBe(false);
    expect(directionalGuard(b, a, getMove(a.id, "air"))).toBe(true);
    b.previous.down = true;
    expect(directionalGuard(b, a, getMove(a.id, "low"))).toBe(true);
    expect(directionalGuard(b, a, getMove(a.id, "airPunch"))).toBe(false);
    b.previous = { left: true };
    expect(directionalGuard(b, a, getMove(a.id, "punch"))).toBe(false);
    b.state = "block";
    b.stun = 10;
    b.previous = { right: true };
    step(m, [{}, { up: true, punch: true, right: true }]);
    expect(b.state).toBe("block");
    expect(b.y).toBe(GROUND);
    expect(b.move).toBeNull();
    b.state = "knockdown";
    expect(directionalGuard(b, a, getMove(a.id, "punch"))).toBe(false);
  });
  it("buffers light-to-heavy confirms and jump input near landing without repeated hitboxes", () => {
    const m = ready(),
      [a, b] = m.fighters;
    step(m, [{ punch: true }, {}]);
    for (let i = 0; i < 30 && !a.confirmed; i++) step(m, [{}, {}]);
    expect(a.confirmed).toBe(true);
    const hp = b.health;
    step(m, [{ heavy: true, punch: true }, {}]);
    run(m, 5);
    expect(b.health).toBe(hp);
    run(m, 25);
    expect(a.move).toBe("heavyPunch");
    expect(b.health).toBeLessThan(hp);
    const n = ready(),
      f = n.fighters[0];
    f.y = GROUND - 2;
    f.vy = 3;
    f.state = "jump";
    step(n, [{ up: true }, {}]);
    expect(f.state).toBe("landing");
    run(n, 4);
    expect(f.state).toBe("jump");
    expect(f.y).toBeLessThan(GROUND);
  });
  it("launches stay within arena edges and every fighter/profile uses the same recovery rules", () => {
    for (const char of roster)
      for (const edge of [LEFT, RIGHT]) {
        const m = createMatch(
          "jamie",
          char.id,
          true,
          char.id === "rob" || char.id === "santa" ? "boss" : "standard",
        );
        m.phase = "fight";
        const [a, b] = m.fighters;
        a.x = edge === RIGHT ? RIGHT - 124 : LEFT + 124;
        b.x = edge;
        a.facing = edge === RIGHT ? 1 : -1;
        launch(m);
        for (let t = 0; t < 150; t++) {
          step(m, [{}, {}]);
          expect(b.x).toBeGreaterThanOrEqual(LEFT);
          expect(b.x).toBeLessThanOrEqual(RIGHT);
          expect(Number.isFinite(b.y)).toBe(true);
        }
        expect(b.state).toBe("idle");
        expect(b.y).toBe(GROUND);
      }
  });
  it("supports both air attacks and grounded launchers for the full roster, including Easy bosses", () => {
    for (const char of roster) {
      const m = createMatch(char.id, "beardy", true);
      m.phase = "fight";
      step(m, [{ up: true, left: true, kick: true }, {}]);
      expect(m.fighters[0].move).toBe("air");
      run(m, 90);
      expect(m.fighters[0].state).toBe("idle");
      const n = ready();
      n.fighters[0] = createMatch(char.id, "beardy", true).fighters[0];
      n.fighters[0].x = 350;
      launch(n);
      run(n, 130);
      expect(n.fighters[1].state).toBe("idle");
    }
    for (const id of ["rob", "santa"] as const) {
      const m = createMatch("jamie", id, true, "boss", "easy");
      m.phase = "fight";
      const [a, b] = m.fighters;
      a.x = 350;
      b.x = 474;
      step(m, [{}, { punch: true, heavy: true }]);
      for (let i = 0; i < 50 && a.state !== "airHit"; i++) step(m, [{}, {}]);
      expect(a.state).toBe("airHit");
      expect(a.juggles).toBe(1);
      run(m, 150);
      expect(a.state).toBe("idle");
      expect(b.difficulty).toBe("easy");
    }
  });
  it("exposes coherent motion phases, bounded frames, planted feet and interpolated motion", () => {
    const m = ready(),
      f = m.fighters[0];
    step(m, [{ up: true }, {}]);
    expect(motionPhase(f)).toBe("jumpStart");
    const phases = new Set<string>();
    for (let i = 0; i < 50; i++) {
      step(m, [{}, {}]);
      phases.add(motionPhase(f));
      expect(animationFrame(f)).toBeGreaterThanOrEqual(0);
      expect(animationFrame(f)).toBeLessThan(40);
    }
    for (const phase of [
      "jumpAscent",
      "jumpApex",
      "jumpDescent",
      "landing",
      "idle",
    ])
      expect(phases.has(phase)).toBe(true);
    f.previousX = 100;
    f.x = 104;
    f.previousY = 290;
    f.y = GROUND;
    expect(renderPosition(f, 0.5)).toEqual({ x: 102, y: GROUND });
    f.y = 280;
    expect(renderPosition(f, 0.5).y).toBe(285);
    f.y = GROUND;
    step(m, [{ right: true }, {}]);
    expect(f.moveSpeed).toBeGreaterThan(0);
    run(m, 4);
    expect(f.moveSpeed).toBe(0);
  });
});
