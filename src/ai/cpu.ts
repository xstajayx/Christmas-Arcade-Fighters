import type { Input, Match } from "../combat/engine";
import { getMove } from "../fighters/data";
export type Difficulty = "easy" | "normal" | "hard";
export type Dummy = "stand" | "block" | "attack" | "jump" | "random";
export class CPU {
  private seed: number;
  private decision: Input = {};
  private next = 0;
  private turn = 0;
  constructor(
    public difficulty: Difficulty = "normal",
    seed = 19,
  ) {
    this.seed = seed;
  }
  random() {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  input(m: Match, index: 0 | 1 = 1, dummy?: Dummy): Input {
    if (dummy === "stand") return {};
    if (dummy === "block")
      return { block: true, down: m.fighters[1 - index].move === "low" };
    if (dummy === "jump") return { up: m.tick % 65 < 30 };
    if (m.tick < this.next) return this.decision;
    const cfg = {
      easy: { delay: 27, guard: 0.23, aggression: 0.55 },
      normal: { delay: 16, guard: 0.5, aggression: 0.77 },
      hard: { delay: 10, guard: 0.72, aggression: 0.9 },
    }[this.difficulty];
    this.next = m.tick + cfg.delay + Math.floor(this.random() * 8);
    this.turn++;
    const me = m.fighters[index],
      foe = m.fighters[1 - index],
      dist = Math.abs(me.x - foe.x),
      toward = me.x < foe.x ? { right: true } : { left: true },
      away = me.x < foe.x ? { left: true } : { right: true };
    let out: Input = {};
    const r = this.random();
    const punish =
      foe.state === "attack" &&
      foe.move &&
      foe.frame >
        getMove(foe.id, foe.move).startup + getMove(foe.id, foe.move).active;
    if (dummy === "attack") out = this.turn % 2 ? { kick: true } : {};
    else if (foe.state === "attack" && dist < 105 && !punish && r < cfg.guard)
      out = { block: true, down: foe.move === "low" };
    else if (dist > 70) out = { ...toward, up: dist > 180 && r < 0.12 };
    else if (r < cfg.aggression || punish) {
      if (this.turn % 2 === 0) out = {};
      else if (me.meter >= 40 && dist < 90 && r < 0.38) out = { special: true };
      else if (dist < 42 && r < 0.23) out = { grab: true };
      else out = r < 0.6 ? { punch: true, down: r < 0.18 } : { kick: true };
    } else out = r > 0.91 ? away : { block: true };
    if (dummy === "random" && r > 0.8) out = { up: true, ...toward };
    this.decision = out;
    return out;
  }
}
