import type { Input, Match } from "../combat/engine";
import { getMove } from "../fighters/data";
export type Difficulty = "easy" | "normal" | "hard" | "master";
export type CPUStyle =
  | "balanced"
  | "rush"
  | "defensive"
  | "projectile"
  | "throw"
  | "combo"
  | "aggressive"
  | "rob"
  | "frost"
  | "santa";
export type Dummy = "stand" | "block" | "attack" | "jump" | "random";
export class CPU {
  private seed: number;
  private decision: Input = {};
  private next = 0;
  private turn = 0;
  private seenMove: string | null = null;
  private seenAt = 0;
  private seenFrame = 0;
  private ownAttack = false;
  private restUntil = 0;
  constructor(
    public difficulty: Difficulty = "normal",
    seed = 19,
    public style: CPUStyle = "balanced",
  ) {
    this.seed = seed;
  }
  random() {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  input(m: Match, index: 0 | 1 = 1, dummy?: Dummy): Input {
    if (dummy === "stand") return {};
    const defender = m.fighters[index],
      attacker = m.fighters[1 - index];
    const guardAway =
      defender.x > attacker.x ? { right: true } : { left: true };
    if (dummy === "block")
      return {
        ...guardAway,
        down:
          m.fighters[1 - index].move === "low" ||
          m.fighters[1 - index].move === "special3",
      };
    if (dummy === "jump") return { up: m.tick % 65 < 30 };
    const observed = m.fighters[1 - index];
    if (observed.state === "attack") {
      if (observed.move !== this.seenMove || observed.frame < this.seenFrame) {
        this.seenMove = observed.move;
        this.seenAt = m.tick;
      }
      this.seenFrame = observed.frame;
    } else {
      this.seenMove = null;
      this.seenFrame = 0;
      this.seenAt = m.tick;
    }
    const owner = m.fighters[index];
    const attacking = owner.state === "attack" || owner.state === "throwing";
    if (
      owner.profile === "boss" &&
      this.ownAttack &&
      !attacking &&
      owner.stun === 0
    )
      this.restUntil =
        m.tick + (owner.id === "santa" ? 20 - owner.bossPhase * 5 : 16);
    this.ownAttack = attacking;
    if (owner.profile === "boss" && m.tick < this.restUntil) return {};
    if (m.tick < this.next) return this.decision;
    const cfg = {
      easy: { delay: 28, guard: 0.22, aggression: 0.53 },
      normal: { delay: 17, guard: 0.47, aggression: 0.74 },
      hard: { delay: 11, guard: 0.68, aggression: 0.88 },
      master: { delay: 8, guard: 0.79, aggression: 0.94 },
    }[this.difficulty];
    const me = m.fighters[index],
      foe = m.fighters[1 - index],
      dist = Math.abs(me.x - foe.x),
      toward = me.x < foe.x ? { right: true } : { left: true },
      away = me.x < foe.x ? { left: true } : { right: true },
      phase = me.profile === "boss" || me.id === "frost" ? me.bossPhase : 0;
    this.next =
      m.tick +
      Math.max(7, cfg.delay - phase * 2) +
      Math.floor(this.random() * 7);
    this.turn++;
    const r = this.random();
    let out: Input = {};
    const canReact = m.tick - this.seenAt >= Math.max(7, cfg.delay - phase * 2);
    const punish =
      canReact &&
      foe.state === "attack" &&
      foe.move &&
      foe.frame >
        getMove(foe.id, foe.move).startup + getMove(foe.id, foe.move).active;
    const missile = m.projectiles.find(
      (p) =>
        p.owner !== index &&
        Math.abs(p.x - me.x) < 150 &&
        Math.sign(me.x - p.x) === Math.sign(p.vx),
    );
    if (dummy === "attack")
      out = dist > 75 ? toward : this.turn % 2 ? { kick: true } : {};
    else if (me.confirmed && me.state === "attack" && me.move === "punch")
      out = me.meter >= 40 && r < 0.45 ? { special: true } : { kick: true };
    else if (this.turn % 2 === 0 && me.state !== "walk") out = {};
    else if (me.superMeter >= 100 && dist < 155 && (punish || r < 0.35))
      out = { super: true };
    else if (missile && 140 - missile.life >= cfg.delay && r < cfg.guard)
      out =
        missile.data.level === "low" && r < 0.5
          ? { up: true }
          : { ...away, down: missile.data.level === "low" };
    else if (
      canReact &&
      foe.state === "attack" &&
      dist < 110 &&
      !punish &&
      r < cfg.guard
    )
      out =
        me.id === "beardy" && me.meter >= 40 && r < 0.32
          ? { special: true }
          : { ...away, down: foe.move === "low" };
    else if (
      me.meter >= 30 &&
      me.health < 45 &&
      r < 0.2 &&
      (me.id === "beardy" || me.id === "frost")
    )
      out = { special2: me.id === "beardy", special3: me.id === "frost" };
    else if (
      dist > 145 &&
      me.meter >= 40 &&
      ["jamie", "bucket", "frost"].includes(me.id) &&
      r < 0.42
    )
      out = { special: true };
    else if (dist > 75)
      out = {
        ...toward,
        up: dist > 180 && r < 0.12,
        dash: dist > 210 && r > 0.65,
      };
    else if (r < cfg.aggression + phase * 0.03 || punish) {
      if (me.meter >= 35 && r < 0.35)
        out =
          me.id === "nash" && dist < 47
            ? { special2: true }
            : r < 0.12
              ? { special3: true }
              : r < 0.24
                ? { special2: true }
                : { special: true };
      else if (dist < 45 && r < 0.22) out = { grab: true };
      else
        out =
          r < 0.62
            ? { punch: true, down: r < 0.14 }
            : { kick: true, heavy: !!punish && r > 0.8 };
    } else out = me.health < foe.health && r > 0.87 ? away : away;
    if (!dummy && me.state !== "attack" && this.turn % 2 !== 0) {
      if (this.style === "throw" && dist < 48 && r < 0.6) out = { grab: true };
      if (
        this.style === "projectile" &&
        dist > 140 &&
        me.meter >= 40 &&
        r < 0.65
      )
        out = { special: true };
      if (
        this.style === "defensive" &&
        canReact &&
        foe.state === "attack" &&
        r < 0.7
      )
        out = { ...away, down: foe.move === "low" };
      if (this.style === "rush" && dist > 100)
        out = { ...toward, dash: r > 0.4 };
      if (this.style === "combo" && me.confirmed && dist < 90)
        out = { kick: true };
      if (this.style === "rob" && me.meter >= 35) {
        if (dist < 50 && r < 0.45) out = { special3: true };
        else if (dist > 100 && r < 0.55) out = { special2: true };
        else if (dist < 90 && r < 0.65) out = { special: true };
      }
      if (this.style === "santa" && me.meter >= 40) {
        if (
          phase === 0 &&
          dist < 95 &&
          canReact &&
          foe.state === "attack" &&
          r < 0.65
        )
          out = away;
        else if (dist > 160 && r < 0.55) out = { special: true };
        else if (phase >= 1 && dist > 95 && r < 0.45) out = { special2: true };
        else if (phase === 2 && r < 0.6) out = { special3: true };
      }
    }
    if (dummy === "random" && r > 0.8) out = { up: true, ...toward };
    this.decision = out;
    return out;
  }
}
