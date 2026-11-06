import { describe, it, expect } from "vitest";
import {
  createMatch,
  step,
  type Match,
  type Input,
} from "../src/combat/engine";
import {
  fighters,
  getMove,
  fighterById,
  signatures,
} from "../src/fighters/data";
import { CPU } from "../src/ai/cpu";
import {
  newCampaign,
  route,
  advance,
  bonuses,
  continueCampaign,
  survivalBout,
  campaignDifficulty,
} from "../src/progression/campaign";
import { animationFrame, clips } from "../src/animation/clips";
const run = (m: Match, n: number, a: Input = {}, b: Input = {}) => {
  for (let i = 0; i < n; i++) step(m, [a, b]);
};
const ready = (a = "jamie", b = "nash") => {
  const m = createMatch(a as "jamie", b as "nash");
  run(m, 100);
  m.fighters[0].x = 350;
  m.fighters[1].x = 405;
  return m;
};
describe("Ultimate combat", () => {
  it("provides fixed dash/projectile primaries and a named Super for each distinct role", () => {
    expect(fighterById("nash").health).toBeGreaterThan(
      fighterById("bucket").health,
    );
    expect(fighterById("bucket").speed).toBeGreaterThan(
      fighterById("nash").speed,
    );
    for (const f of fighters) {
      expect(new Set(signatures[f.id]).size).toBe(4);
      expect(
        new Set(
          ["special", "special2", "special3"].map(
            (id) => getMove(f.id, id as "special").kind || "strike",
          ),
        ).size,
      ).toBeGreaterThan(1);
    }
  });
  it("a projectile travels, hits once, builds meter and expires", () => {
    const m = ready();
    m.fighters[1].x = 570;
    m.fighters[0].meter = 100;
    const hp = m.fighters[1].health;
    run(m, 20, { special2: true });
    expect(m.projectiles.length).toBe(1);
    run(m, 70);
    expect(m.fighters[1].health).toBeLessThan(hp);
    const after = m.fighters[1].health;
    run(m, 60);
    expect(m.projectiles.length).toBe(0);
    expect(m.fighters[1].health).toBe(after);
  });
  it("hit-confirm cancels produce a true two-hit chain", () => {
    const m = ready();
    run(m, 7, { punch: true });
    expect(m.fighters[0].confirmed).toBe(true);
    step(m, [{ kick: true }, {}]);
    expect(m.fighters[0].buffer?.move).toBe("kick");
    run(m, m.hitstop + 1);
    expect(m.fighters[0].move).toBe("kick");
    run(m, 22);
    expect(m.fighters[0].combo).toBeGreaterThanOrEqual(2);
    expect(m.fighters[0].comboDamage).toBeGreaterThan(7);
  });
  it("a whiff cannot be cancelled", () => {
    const m = ready();
    m.fighters[1].x = 700;
    run(m, 7, { punch: true });
    step(m, [{ kick: true }, {}]);
    expect(m.fighters[0].move).toBe("punch");
  });
  it("Supers require full separate meter, freeze the clock, then execute multiple contacts", () => {
    const m = ready();
    m.fighters[0].meter = 100;
    step(m, [{ super: true }, {}]);
    expect(m.fighters[0].move).toBeNull();
    m.fighters[0].superMeter = 100;
    step(m, [{}, {}]);
    step(m, [{ super: true }, {}]);
    expect(m.cinematic).toBe(42);
    expect(m.fighters[0].superMeter).toBe(0);
    const timer = m.timer;
    run(m, 42);
    expect(m.timer).toBe(timer);
    run(m, 90);
    expect(m.fighters[0].combo).toBeGreaterThanOrEqual(2);
  });
  it("Beardy's green projectile actually damages an opponent and expires", () => {
    const m = ready("beardy", "jamie");
    m.fighters[1].x = 570;
    m.fighters[0].meter = 100;
    const hp = m.fighters[1].health;
    run(m, 20, { special2: true });
    expect(m.projectiles.length).toBe(1);
    run(m, 80);
    expect(m.fighters[1].health).toBeLessThan(hp);
    expect(m.fighters[0].guardFrames).toBe(0);
    expect(m.projectiles).toHaveLength(0);
  });
  it("Frost Jamie changes attack phases and applies a defensive transition", () => {
    const m = ready("jamie", "frost");
    m.fighters[1].health = Math.floor(fighterById("frost").health * 0.6);
    step(m, [{}, {}]);
    expect(m.fighters[1].bossPhase).toBe(1);
    expect(m.fighters[1].guardFrames).toBeGreaterThan(0);
    m.fighters[1].health = Math.floor(fighterById("frost").health * 0.25);
    step(m, [{}, {}]);
    expect(m.fighters[1].bossPhase).toBe(2);
  });
  it("different attack frames cover anticipation, contact and recovery independent of renderer time", () => {
    const f = ready().fighters[0];
    f.state = "attack";
    f.move = "punch";
    const frames = [];
    for (let tick = 0; tick < 23; tick++) {
      f.frame = tick;
      frames.push(animationFrame(f));
    }
    expect(new Set(frames).size).toBeGreaterThanOrEqual(5);
    expect(new Set(clips.forward).size).toBe(8);
  });
});
describe("campaign and survival", () => {
  it("ten wins reach the distinct boss and complete exactly once", () => {
    const c = newCampaign("jamie");
    const path = route(c.fighter);
    expect(path).toHaveLength(10);
    expect(new Set(path.map((b) => b.stage)).size).toBe(8);
    expect(path[8].opponent).toBe("frost");
    expect(path[8].line).toContain("Jamie");
    for (let i = 0; i < 10; i++) expect(advance(c, true, 1000)).toBe(true);
    expect(c.completed).toBe(true);
    expect(c.score).toBe(10000);
    expect(advance(c, true, 1000)).toBe(false);
  });
  it("continues are limited and a defeat does not advance the route", () => {
    const c = newCampaign("bucket", 3);
    expect(advance(c, false, 999)).toBe(false);
    expect(c.index).toBe(3);
    expect([
      continueCampaign(c),
      continueCampaign(c),
      continueCampaign(c),
      continueCampaign(c),
    ]).toEqual([true, true, true, false]);
  });
  it("bonuses are measurable and survival escalates without a fake ending", () => {
    expect(bonuses(50, 100, 600, 3)).toEqual({
      health: 500,
      time: 200,
      combo: 300,
    });
    const c = newCampaign("nash", 0, true);
    for (let i = 0; i < 12; i++) advance(c, true, 100);
    expect(c.completed).toBe(false);
    expect(survivalBout(c).difficulty).toBe("master");
  });
  it("a seeded input-driven player can finish the ten real combat bouts", () => {
    const c = newCampaign("nash");
    for (const bout of route("nash")) {
      let won = false;
      for (let attempt = 0; attempt < 4 && !won; attempt++) {
        const m = createMatch("nash", bout.opponent, false, bout.profile),
          player = new CPU("master", 7 + attempt),
          cpu = new CPU(bout.difficulty, 41 + c.index * 17, bout.style);
        for (let t = 0; t < 25000 && m.phase !== "matchOver"; t++)
          step(m, [player.input(m, 0), cpu.input(m, 1)]);
        expect(m.phase).toBe("matchOver");
        won = m.winner === 0;
        if (won) advance(c, true, m.fighters[0].score);
        else
          expect(
            continueCampaign(c),
            `continue budget at level ${c.index + 1}`,
          ).toBe(true);
      }
      expect(won, `stage ${bout.stage}`).toBe(true);
    }
    expect(c.completed).toBe(true);
  });
});
it("CPU cannot respond to an unseen fresh attack before its reaction budget", () => {
  for (const difficulty of ["easy", "normal", "hard", "master"] as const) {
    const m = ready();
    m.fighters[0].state = "attack";
    m.fighters[0].move = "punch";
    m.fighters[0].frame = 0;
    const cpu = new CPU(difficulty, 3);
    const neutral = ready();
    const planned = new CPU(difficulty, 3).input(neutral, 1);
    const input = cpu.input(m, 1);
    // A preplanned guard is allowed; the newly observed attack must not alter it.
    expect(input).toEqual(planned);
  }
});

it("selected campaign difficulty actually modifies the route decision level", () => {
  expect(campaignDifficulty("normal", "easy")).toBe("easy");
  expect(campaignDifficulty("normal", "hard")).toBe("hard");
  expect(campaignDifficulty("hard", "master")).toBe("master");
  expect(campaignDifficulty("easy", "normal")).toBe("easy");
});

it("each signature uses its own valid six-pose row with timed contact", () => {
  for (const id of ["jamie", "nash", "bucket", "beardy", "frost"] as const) {
    const f = ready(id).fighters[0];
    f.state = "attack";
    for (const [row, move] of (
      ["special", "special2", "special3", "super"] as const
    ).entries()) {
      f.move = move;
      const d = getMove(id, move);
      f.frame = 0;
      const anticipation = animationFrame(f);
      f.frame = d.startup;
      const contact = animationFrame(f);
      f.frame = d.startup + d.active + d.recovery - 1;
      const recovery = animationFrame(f);
      const poseRow = d.poseRow ?? row;
      expect(anticipation).toBe(poseRow * 6);
      expect(contact).toBe(poseRow * 6 + 3);
      expect(recovery).toBe(poseRow * 6 + 5);
    }
  }
});
