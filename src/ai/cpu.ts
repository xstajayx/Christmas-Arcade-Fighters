import { difficultyTuning } from "../combat/difficulty";
import type { MoveId } from "../fighters/data";
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
  private lastAttack: MoveId | null = null;
  private lastConfirmed = false;
  private projectileAt = 0;
  private dashAt = 0;
  private superAt = 0;
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
    const cfg = difficultyTuning[this.difficulty];
    const easy = this.difficulty === "easy";
    const owner = m.fighters[index];
    const attacking = owner.state === "attack" || owner.state === "throwing";
    if (
      owner.profile === "boss" &&
      this.ownAttack &&
      !attacking &&
      (owner.stun === 0 || easy)
    )
      this.restUntil =
        m.tick +
        (easy
          ? cfg.bossRest +
            (!this.lastConfirmed ? cfg.whiffRest : 0) +
            (["heavyPunch", "heavyKick", "super"].includes(
              this.lastAttack || "",
            )
              ? cfg.heavyRest
              : 0)
          : owner.id === "santa"
            ? 24 - owner.bossPhase * 5
            : 24);
    if (attacking && owner.move) {
      if (!this.ownAttack) {
        const move = getMove(
          owner.id,
          owner.move,
          owner.profile,
          owner.bossPhase,
        );
        if (owner.move === "super") this.superAt = m.tick + cfg.superCooldown;
        else if (["projectile", "wave"].includes(move.kind || ""))
          this.projectileAt = m.tick + cfg.projectileCooldown;
        else if (move.dash) this.dashAt = m.tick + cfg.dashCooldown;
      }
      this.lastAttack = owner.move;
      this.lastConfirmed = owner.confirmed;
    }
    this.ownAttack = attacking;
    if (owner.profile === "boss" && m.tick < this.restUntil) return {};
    if (m.tick < this.next) return this.decision;
    const me = m.fighters[index],
      foe = m.fighters[1 - index],
      dist = Math.abs(me.x - foe.x),
      toward = me.x < foe.x ? { right: true } : { left: true },
      away = me.x < foe.x ? { left: true } : { right: true },
      phase = me.profile === "boss" || me.id === "frost" ? me.bossPhase : 0;
    this.next =
      m.tick +
      Math.max(7, cfg.delay - (easy ? 0 : phase * 2)) +
      Math.floor(this.random() * 7);
    this.turn++;
    const r = this.random();
    let out: Input = {};
    const canReact =
      m.tick - this.seenAt >= Math.max(7, cfg.delay - (easy ? 0 : phase * 2));
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
      out = dist > 124 ? toward : this.turn % 2 ? { kick: true } : {};
    else if (me.confirmed && me.state === "attack" && me.move === "punch")
      out = me.meter >= 40 && r < 0.45 ? { special: true } : { kick: true };
    else if (this.turn % 2 === 0 && me.state !== "walk") out = {};
    else if (
      me.superMeter >= 100 &&
      dist < 155 &&
      (punish || r < cfg.superChance)
    )
      out = { super: true };
    else if (missile && 140 - missile.life >= cfg.delay && r < cfg.guard)
      out =
        missile.data.level === "low" && r < 0.5
          ? { up: true }
          : { ...away, down: missile.data.level === "low" };
    else if (
      canReact &&
      foe.state === "attack" &&
      dist < 145 &&
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
    else if (dist > 124)
      out = {
        ...toward,
        up: dist > 180 && r < 0.12,
        dash: dist > 210 && r > 0.65,
      };
    else if (r < cfg.aggression + phase * 0.03 || punish) {
      if (me.meter >= 35 && r < 0.35)
        out =
          me.id === "nash" && dist < 132
            ? { special2: true }
            : r < 0.12
              ? { special3: true }
              : r < 0.24
                ? { special2: true }
                : { special: true };
      else if (dist < 132 && r < 0.22) out = { grab: true };
      else
        out =
          r < 0.62
            ? { punch: true, down: r < 0.14 }
            : { kick: true, heavy: !!punish && r > 0.8 };
    } else out = me.health < foe.health && r > 0.87 ? away : away;
    if (!dummy && me.state !== "attack" && this.turn % 2 !== 0) {
      if (this.style === "throw" && dist < 132 && r < 0.6) out = { grab: true };
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
      if (this.style === "combo" && me.confirmed && dist < 135)
        out = { kick: true };
      if (this.style === "rob" && me.meter >= 35) {
        if (dist < 132 && r < 0.45) out = { special3: true };
        else if (dist > 100 && r < 0.55) out = { special2: true };
        else if (dist < 135 && r < 0.65) out = { special: true };
      }
      if (this.style === "santa" && me.meter >= 40) {
        if (
          phase === 0 &&
          dist < 140 &&
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
    if (me.profile !== "boss") {
      // Two fixed primary specials. Retain the extra scripted repertoire only on bosses.
      if (out.special3) {
        delete out.special3;
        out.special2 = true;
      }
      if (out.special || out.special2) {
        delete out.special;
        delete out.special2;
        if (dist > 130) out.special2 = true;
        else out.special = true;
      }
    }
    if (easy && !dummy) {
      if (me.confirmed && me.state === "attack" && r >= cfg.combo) out = {};
      const action = (
        [
          "super",
          "special3",
          "special2",
          "special",
          "heavyPunch",
          "heavyKick",
        ] as MoveId[]
      ).find((key) => (out as Record<string, boolean>)[key]);
      if (action) {
        const move = getMove(me.id, action, me.profile, me.bossPhase);
        if (
          (action === "super" &&
            (m.tick < this.superAt || r >= cfg.superChance)) ||
          (action !== "super" &&
            ["projectile", "wave"].includes(move.kind || "") &&
            m.tick < this.projectileAt) ||
          (action !== "super" && move.dash && m.tick < this.dashAt)
        )
          out = {};
      }
    }
    this.decision = out;
    return out;
  }
}
