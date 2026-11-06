import { difficultyTuning } from "./difficulty";
import type { Difficulty } from "../ai/cpu";
import { activeSuper } from "./presentation";
import { balance, bodyWidths } from "./balance";
import {
  fighterById,
  getMove,
  type FighterId,
  type MoveId,
  type Move,
  type BalanceProfile,
} from "../fighters/data";
export type State =
  | "idle"
  | "walk"
  | "dash"
  | "landing"
  | "crouch"
  | "jump"
  | "attack"
  | "block"
  | "hitstun"
  | "knockdown"
  | "recovery"
  | "victory"
  | "defeat"
  | "throwing"
  | "thrown"
  | "airHit";
export interface Input {
  left?: boolean;
  right?: boolean;
  up?: boolean;
  down?: boolean;
  punch?: boolean;
  kick?: boolean;
  heavy?: boolean;
  special?: boolean;
  special2?: boolean;
  special3?: boolean;
  super?: boolean;
  grab?: boolean;
  dash?: boolean;
}
export interface Fighter {
  id: FighterId;
  profile: BalanceProfile;
  difficulty: Difficulty;
  maxHealth: number;
  x: number;
  y: number;
  vy: number;
  airSpeed: number;
  airTicks: number;
  jumpBuffer: number;
  airborneKnockdown: boolean;
  previousX: number;
  previousY: number;
  facing: 1 | -1;
  health: number;
  meter: number;
  superMeter: number;
  state: State;
  frame: number;
  animTick: number;
  walkDistance: number;
  moveSpeed: number;
  move: MoveId | null;
  hit: boolean;
  spawned: boolean;
  stun: number;
  combo: number;
  comboDamage: number;
  comboAge: number;
  juggles: number;
  received: number;
  buffer: { move: MoveId; age: number } | null;
  previous: Input;
  previousJump?: boolean;
  wins: number;
  score: number;
  invuln: number;
  guardFrames: number;
  counterFrames: number;
  slowFrames: number;
  bossPhase: number;
  confirmed: boolean;
  throwImmunity: number;
  vx: number;
}
export interface CombatEvent {
  type:
    | "hit"
    | "block"
    | "jump"
    | "special"
    | "super"
    | "projectile"
    | "counter"
    | "guard"
    | "bossPhase"
    | "ko"
    | "round"
    | "fight"
    | "grab"
    | "throw"
    | "throwBreak"
    | "landing";
  x: number;
  y: number;
  damage?: number;
  player?: number;
  move?: MoveId;
  strength?: "light" | "heavy" | "special" | "counter";
  firstHit?: boolean;
}
export interface Projectile {
  id: number;
  owner: 0 | 1;
  x: number;
  y: number;
  vx: number;
  w: number;
  h: number;
  life: number;
  move: MoveId;
  data: Move;
  style: FighterId;
}
export type Phase = "intro" | "fight" | "roundOver" | "matchOver";
export interface Match {
  fighters: [Fighter, Fighter];
  tick: number;
  timer: number;
  roundTicks: number;
  round: number;
  phase: Phase;
  phaseFrame: number;
  hitstop: number;
  winner: 0 | 1 | "draw" | null;
  roundWinner: 0 | 1 | "draw" | null;
  events: CombatEvent[];
  training: boolean;
  projectiles: Projectile[];
  nextProjectile: number;
  cinematic: number;
  cinematicPlayer: 0 | 1;
  firstHit: boolean;
  roundsToWin: number;
  throwSequence: {
    attacker: 0 | 1;
    frame: number;
    direction: 1 | -1;
    startX: number;
    attackerX: number;
    move: MoveId;
    data: Move;
  } | null;
}
export const GROUND = 300,
  LEFT = 45,
  RIGHT = 755;
export function makeFighter(
  id: FighterId,
  x: number,
  facing: 1 | -1,
  profile: BalanceProfile = "standard",
  difficulty: Difficulty = "normal",
): Fighter {
  return {
    id,
    profile,
    difficulty,
    maxHealth: Math.round(
      fighterById(id, profile).health *
        (profile === "boss" ? difficultyTuning[difficulty].bossHealth : 1),
    ),
    x,
    y: GROUND,
    vy: 0,
    airSpeed: 0,
    airTicks: 0,
    jumpBuffer: 0,
    airborneKnockdown: false,
    previousX: x,
    previousY: GROUND,
    facing,
    health: Math.round(
      fighterById(id, profile).health *
        (profile === "boss" ? difficultyTuning[difficulty].bossHealth : 1),
    ),
    meter: 20,
    superMeter: 0,
    state: "idle",
    frame: 0,
    animTick: 0,
    walkDistance: 0,
    moveSpeed: 0,
    move: null,
    hit: false,
    spawned: false,
    stun: 0,
    combo: 0,
    comboDamage: 0,
    comboAge: 0,
    juggles: 0,
    received: 0,
    buffer: null,
    previous: {},
    wins: 0,
    score: 0,
    invuln: 0,
    guardFrames: 0,
    counterFrames: 0,
    slowFrames: 0,
    bossPhase: 0,
    confirmed: false,
    throwImmunity: 0,
    vx: 0,
  };
}
export function createMatch(
  a: FighterId,
  b: FighterId,
  training = false,
  opponentProfile: BalanceProfile = "standard",
  difficulty: Difficulty = "normal",
): Match {
  return {
    fighters: [
      makeFighter(a, 245, 1),
      makeFighter(b, 555, -1, opponentProfile, difficulty),
    ],
    tick: 0,
    timer: 5940,
    roundTicks: 5940,
    round: 1,
    phase: "intro",
    phaseFrame: 0,
    hitstop: 0,
    winner: null,
    roundWinner: null,
    events: [],
    training,
    projectiles: [],
    nextProjectile: 0,
    cinematic: 0,
    cinematicPlayer: 0,
    firstHit: false,
    roundsToWin: 2,
    throwSequence: null,
  };
}
export function resetRound(m: Match) {
  const old = m.fighters;
  m.fighters = [
    makeFighter(old[0].id, 245, 1, old[0].profile, old[0].difficulty),
    makeFighter(old[1].id, 555, -1, old[1].profile, old[1].difficulty),
  ];
  m.fighters.forEach((f, i) => {
    f.wins = old[i].wins;
    f.score = old[i].score;
    f.meter = old[i].meter;
    f.superMeter = old[i].superMeter;
  });
  m.cinematic = 0;
  m.hitstop = 0;
  m.round++;
  m.timer = m.roundTicks;
  m.phase = "intro";
  m.phaseFrame = 0;
  m.roundWinner = null;
  m.projectiles = [];
  m.firstHit = false;
  m.throwSequence = null;
}
export function activeHitbox(f: Fighter) {
  if (f.state !== "attack" || !f.move) return null;
  const d = combatMove(f, f.move);
  if (["projectile", "wave", "shield", "counter"].includes(d.kind || ""))
    return null;
  if (f.frame < d.startup || f.frame >= d.startup + d.active) return null;
  if (d.hitGap && (f.frame - d.startup) % d.hitGap >= 4) return null;
  return {
    x:
      f.x +
      (f.facing === 1
        ? 13
        : -13 - d.range * fighterById(f.id, f.profile).reach),
    y:
      f.y -
      (d.hitboxY ?? (d.level === "low" ? 55 : d.level === "air" ? 150 : 125)),
    w: d.range * fighterById(f.id, f.profile).reach,
    h: d.hitboxHeight ?? (d.level === "low" ? 55 : 80),
  };
}
export const hurtbox = (f: Fighter) => ({
  x: f.x - 40,
  y:
    f.y -
    (f.state === "crouch" || (f.state === "block" && f.previous.down)
      ? 125
      : 167),
  w: 80,
  h:
    f.state === "crouch" || (f.state === "block" && f.previous.down)
      ? 125
      : 167,
});
export function overlaps(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}
const clamp = (x: number) => Math.max(LEFT, Math.min(RIGHT, x));
const free = (f: Fighter) =>
  ["idle", "walk", "dash", "crouch", "jump", "block"].includes(f.state);
function startMove(m: Match, f: Fighter, move: MoveId, index: 0 | 1) {
  if (f.y < GROUND) {
    if (["punch", "heavyPunch", "low"].includes(move)) move = "airPunch";
    else if (move === "kick" || move === "heavyKick") move = "air";
  }
  const d = combatMove(f, move);
  if (
    (f.y < GROUND && d.level === "grab") ||
    ((move === "air" || move === "airPunch") && f.y >= GROUND) ||
    f.meter < d.cost ||
    (move === "super" && f.superMeter < 100)
  ) {
    f.buffer = null;
    return false;
  }
  f.meter -= d.cost;
  if (move === "super") {
    f.superMeter = 0;
    m.cinematic = 42;
    m.cinematicPlayer = index;
  }
  f.move = move;
  f.state = "attack";
  f.frame = 0;
  f.hit = false;
  f.spawned = false;
  f.confirmed = false;
  f.buffer = null;
  f.invuln = d.invulnerable || 0;
  if (move.startsWith("special") || move === "super")
    m.events.push({
      type: move === "super" ? "super" : "special",
      x: f.x,
      y: f.y - 100,
      player: index,
      move,
    });
  return true;
}
function readAttack(f: Fighter, input: Input): MoveId | null {
  for (const key of [
    "super",
    "special3",
    "special2",
    "special",
    "grab",
    "kick",
    "punch",
  ] as const) {
    if (input[key] && !f.previous[key]) {
      if (key === "special3" && f.profile !== "boss") continue;
      if (key === "punch" || key === "kick") {
        if (
          f.y < GROUND ||
          (input.up && !f.previous.up && free(f) && f.stun === 0)
        )
          return key === "punch" ? "airPunch" : "air";
        if (input.down) return "low";
        if (input.heavy || (f.facing === 1 ? input.right : input.left))
          return key === "punch" ? "heavyPunch" : "heavyKick";
      }
      return key;
    }
  }
  return null;
}
function startJump(m: Match, f: Fighter, input: Input, index: 0 | 1) {
  const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  f.airSpeed =
    direction *
    fighterById(f.id, f.profile).speed *
    (direction === f.facing ? balance.jumpForward : balance.jumpBackward);
  f.y = GROUND - 1;
  f.vy = -balance.jumpImpulse;
  f.airTicks = 0;
  f.airborneKnockdown = false;
  f.jumpBuffer = 0;
  f.moveSpeed = 0;
  f.state = "jump";
  f.move = null;
  f.frame = 0;
  m.events.push({ type: "jump", x: f.x, y: f.y, player: index });
}
// All melee and projectile contacts use the same juggle gate. The launch consumes
// one contact; Easy CPUs get no repeated air string. Throws remain protected.
function canContact(attacker: Fighter, defender: Fighter) {
  return (
    defender.invuln === 0 &&
    defender.health > 0 &&
    defender.state !== "recovery" &&
    defender.state !== "knockdown" &&
    !(
      defender.y < GROUND &&
      defender.juggles >=
        (attacker.difficulty === "easy"
          ? balance.easyJuggleHits
          : balance.maxJuggles)
    )
  );
}
function airGravity(f: Fighter) {
  return (
    balance.gravity *
    (f.state === "airHit" || f.airborneKnockdown
      ? 1 + f.juggles * balance.juggleGravity
      : 1)
  );
}
function updateFighter(m: Match, f: Fighter, input: Input, index: 0 | 1) {
  f.frame++;
  f.animTick++;
  f.comboAge++;
  if (f.comboAge > 80) {
    f.combo = 0;
    f.comboDamage = 0;
  }
  if (f.stun === 0) f.received = 0;
  for (const key of [
    "invuln",
    "guardFrames",
    "counterFrames",
    "slowFrames",
    "throwImmunity",
  ] as const)
    if (f[key] > 0) f[key]--;
  if (f.buffer && ++f.buffer.age > balance.attackBufferTicks) f.buffer = null;
  if (f.jumpBuffer > 0) f.jumpBuffer--;
  const grounded = f.y >= GROUND;
  if (f.id === "frost" || f.profile === "boss") {
    const ratio = f.health / f.maxHealth,
      phase =
        f.id === "rob"
          ? ratio < 0.5
            ? 1
            : 0
          : ratio < 0.34
            ? 2
            : ratio < 0.67
              ? 1
              : 0;
    if (phase > f.bossPhase) {
      f.bossPhase = phase;
      f.guardFrames = f.profile === "boss" ? 30 : 90;
      m.events.push({ type: "bossPhase", x: f.x, y: f.y - 100, player: index });
    }
  }
  if (f.stun > 0) {
    if (!(
      (f.state === "knockdown" || f.state === "airHit") &&
      !grounded &&
      f.stun === 1
    ))
      f.stun--;
    if (f.stun === 0) {
      f.state =
        f.state === "knockdown" ? "recovery" : grounded ? "idle" : "jump";
      if (f.state === "recovery") f.invuln = 10;
      f.frame = 0;
    }
  } else if (
    (f.state === "recovery" && f.frame >= 10) ||
    (f.state === "landing" && f.frame >= 4)
  ) {
    f.state = "idle";
    f.frame = 0;
  } else if (f.state === "attack" && f.move) {
    const d = combatMove(f, f.move);
    const jumpCancel =
      grounded &&
      f.jumpBuffer > 0 &&
      f.confirmed &&
      d.jumpCancel &&
      f.frame >= d.startup &&
      f.frame <= d.startup + d.active + 9;
    if (jumpCancel) startJump(m, f, input, index);
    else {
      if (
        f.buffer &&
        f.confirmed &&
        d.cancel?.includes(f.buffer.move) &&
        f.frame >= d.startup &&
        f.frame <= d.startup + d.active + 9 &&
        f.combo < 6 &&
        (f.buffer.move !== f.move || f.combo < 2)
      )
        startMove(m, f, f.buffer.move, index);
      const active = combatMove(f, f.move!);
      if (f.frame >= active.startup + active.active + active.recovery) {
        f.state = grounded ? "idle" : "jump";
        f.move = null;
        f.frame = 0;
      } else if (
        f.frame >= active.startup &&
        f.frame < active.startup + active.active
      ) {
        if (active.hitGap && (f.frame - active.startup) % active.hitGap === 0)
          f.hit = false;
        if (active.dash) f.x += active.dash * f.facing;
        if (active.kind === "counter") f.counterFrames = 2;
        if (
          active.bursts &&
          (f.frame - active.startup) % Math.max(1, active.burstGap || 10) ===
            0 &&
          Math.floor((f.frame - active.startup) / (active.burstGap || 10)) <
            active.bursts
        )
          f.spawned = false;
        if (!f.spawned) {
          f.spawned = true;
          if (active.kind === "projectile" || active.kind === "wave") {
            m.projectiles.push({
              id: ++m.nextProjectile,
              owner: index,
              x: f.x + f.facing * 42,
              y: f.y - (active.kind === "wave" ? 44 : 105),
              vx: f.facing * (active.projectileSpeed || 5),
              w: active.kind === "wave" ? 38 : 28,
              h: active.kind === "wave" ? 55 : 28,
              life: 140,
              move: f.move!,
              data: { ...active },
              style: f.id,
            });
            m.events.push({
              type: "projectile",
              x: f.x,
              y: f.y - 100,
              player: index,
              move: f.move!,
            });
          }
          if (active.kind === "shield") {
            f.guardFrames = 180;
            m.events.push({
              type: "guard",
              x: f.x,
              y: f.y - 90,
              player: index,
            });
          }
          if (active.kind === "teleport") {
            f.x = clamp(f.x + f.facing * 115);
            f.invuln = 12;
          }
          if (active.kind === "aerial" && grounded) {
            f.vy = -7;
            f.y--;
          }
        }
      }
    }
  }
  if (free(f) && f.stun === 0) {
    if (f.y >= GROUND && f.jumpBuffer > 0) startJump(m, f, input, index);
    if (f.buffer) startMove(m, f, f.buffer.move, index);
    if (f.state !== "attack") {
      if (f.y >= GROUND)
        f.state = guardThreat(m, f, index)
          ? "block"
          : input.down
            ? "crouch"
            : "idle";
      if (f.y >= GROUND) {
        const target =
          f.state !== "block" && !input.down
            ? ((input.right ? 1 : 0) - (input.left ? 1 : 0)) *
              fighterById(f.id, f.profile).speed *
              (input.dash ? 1.8 : 1) *
              (f.slowFrames > 0 ? 0.65 : 1)
            : 0;
        if (f.state === "block" || f.state === "crouch") f.moveSpeed = 0;
        const change =
          target === 0
            ? balance.braking
            : f.moveSpeed * target < 0
              ? balance.reversing
              : balance.acceleration;
        f.moveSpeed += Math.max(
          -change,
          Math.min(change, target - f.moveSpeed),
        );
        f.x += f.moveSpeed;
        if (f.state !== "block" && f.state !== "crouch")
          f.state =
            Math.abs(f.moveSpeed) > 0.02
              ? input.dash
                ? "dash"
                : "walk"
              : "idle";
      }
    }
  }
  if (!free(f) || f.stun > 0) f.moveSpeed = 0;
  f.previousJump = !!input.up;
  if (f.y < GROUND || f.vy < 0) {
    f.airTicks++;
    const launched = f.state === "airHit";
    if (!launched && f.state !== "knockdown") {
      const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const target =
        direction *
        fighterById(f.id, f.profile).speed *
        (direction === f.facing ? balance.jumpForward : balance.jumpBackward);
      f.airSpeed += Math.max(
        -balance.airControl,
        Math.min(balance.airControl, target - f.airSpeed),
      );
    }
    if (launched && f.airTicks >= balance.maxAirTicks) f.vy = Math.max(5, f.vy);
    f.vy += airGravity(f);
    f.y += f.vy;
    f.x += f.airSpeed;
    if (f.y >= GROUND) {
      const wasAirAttack = f.move === "air" || f.move === "airPunch";
      f.y = GROUND;
      f.vy = 0;
      f.airSpeed = 0;
      f.airTicks = 0;
      f.juggles = 0;
      m.events.push({ type: "landing", x: f.x, y: GROUND, player: index });
      if (launched || f.airborneKnockdown) {
        f.state = "knockdown";
        f.stun = 18;
        f.frame = 21;
        f.airborneKnockdown = false;
        f.move = null;
        f.buffer = null;
      } else if (f.state === "knockdown") {
        f.vx *= 0.35;
        f.stun = Math.max(f.stun, 18);
      } else if (f.state === "jump" || wasAirAttack) {
        f.state = "landing";
        f.move = null;
        f.frame = 0;
        f.stun = wasAirAttack
          ? balance.airAttackLandingRecovery
          : balance.landingRecovery;
      }
    }
  }
  f.x = clamp(f.x + f.vx);
  f.vx *=
    f.state === "knockdown" && f.throwImmunity > 0 && f.y < GROUND
      ? 0.97
      : f.state === "airHit"
        ? balance.launchDrag
        : balance.groundDrag;
}

export function directionalGuard(
  defender: Fighter,
  attacker: Fighter,
  move: Move,
) {
  const away =
    defender.x > attacker.x ? defender.previous.right : defender.previous.left;
  return (
    !!away &&
    defender.y === GROUND &&
    ((free(defender) && defender.stun === 0) || defender.state === "block") &&
    move.level !== "grab" &&
    (move.level === "low"
      ? !!defender.previous.down
      : move.level === "high" || move.level === "air"
        ? !defender.previous.down
        : true)
  );
}
function guardThreat(m: Match, f: Fighter, index: 0 | 1) {
  const foe = m.fighters[1 - index];
  const d = foe.move ? combatMove(foe, foe.move) : null;
  const incoming =
    d &&
    foe.state === "attack" &&
    foe.frame >= 0 &&
    foe.frame < d.startup + d.active &&
    Math.abs(f.x - foe.x) < d.range + 60 &&
    d.level !== "grab";
  const projectile = m.projectiles.find(
    (p) =>
      p.owner !== index &&
      Math.abs(p.x - f.x) < 100 &&
      Math.sign(f.x - p.x) === Math.sign(p.vx),
  );
  return incoming
    ? directionalGuard(f, foe, d)
    : projectile
      ? directionalGuard(f, foe, projectile.data)
      : false;
}
function updateThrow(m: Match) {
  const t = m.throwSequence!,
    a = m.fighters[t.attacker],
    b = m.fighters[1 - t.attacker];
  if (t.frame < 8 && b.buffer?.move === "grab" && b.buffer.age === 0) {
    a.state = b.state = "recovery";
    a.frame = b.frame = 0;
    a.stun = b.stun = 10;
    a.invuln = b.invuln = 12;
    a.buffer = b.buffer = null;
    a.vx = -t.direction * 2;
    b.vx = t.direction * 2;
    m.throwSequence = null;
    m.events.push({ type: "throwBreak", x: (a.x + b.x) / 2, y: GROUND - 80 });
    return false;
  }
  t.frame++;
  a.frame = b.frame = t.frame;
  const smooth = (n: number) => {
    const x = Math.max(0, Math.min(1, n));
    return x * x * (3 - 2 * x);
  };
  const pull = smooth(t.frame / 12),
    lift = smooth((t.frame - 8) / 12);
  a.x = clamp(t.attackerX + t.direction * 18 * pull);
  a.facing = t.direction;
  b.facing = t.direction === 1 ? -1 : 1;
  // Keep shoulders within reach rather than pulling both body centres together.
  const holdX = a.x + t.direction * (92 - lift * 70);
  b.x = clamp(t.startX + (holdX - t.startX) * pull);
  b.y = GROUND - lift * 60;
  b.vy = 0;
  if (t.frame < 24) return true;
  b.state = "idle";
  b.invuln = 0;
  applyContact(m, {
    attacker: t.attacker,
    data: t.data,
    move: t.move,
    throwRelease: true,
  });
  b.state = "knockdown";
  b.stun = Math.max(35, b.stun);
  b.frame = 0;
  b.vy = -6.2;
  b.vx = t.direction * 7;
  a.vx = -t.direction * 1.2;
  b.throwImmunity = 75;
  a.state = "recovery";
  a.invuln = 8;
  a.frame = 0;
  a.stun = 12;
  a.move = null;
  a.throwImmunity = 25;
  m.events.push({
    type: "throw",
    x: b.x,
    y: b.y,
    player: t.attacker,
    damage: t.data.damage,
    strength: "heavy",
  });
  m.throwSequence = null;
  return false;
}
interface Contact {
  attacker: 0 | 1;
  data: Move;
  move: MoveId;
  projectile?: Projectile;
  counter?: boolean;
  throwRelease?: boolean;
}
function applyContact(m: Match, c: Contact) {
  const f = m.fighters[c.attacker],
    o = m.fighters[1 - c.attacker];
  const d = c.data;
  if (!canContact(f, o)) return;
  if (d.level === "grab" && !m.throwSequence && f.state !== "throwing") {
    if (o.y !== GROUND || o.stun > 0 || o.throwImmunity > 0 || !free(o)) return;
    f.hit = true;
    f.buffer = null;
    o.buffer = null;
    f.invuln = o.invuln = 25;
    f.state = "throwing";
    o.state = "thrown";
    f.frame = o.frame = 0;
    m.throwSequence = {
      attacker: c.attacker,
      frame: 0,
      direction: f.facing,
      startX: o.x,
      attackerX: f.x,
      move: c.move,
      data: { ...d },
    };
    m.events.push({ type: "grab", x: f.x, y: f.y - 80, player: c.attacker });
    return;
  }
  if (o.counterFrames > 0 && d.level !== "grab" && !c.counter) {
    o.counterFrames = 0;
    f.move = null;
    f.stun = 30;
    f.state = f.y < GROUND ? "airHit" : "hitstun";
    if (f.state === "airHit") {
      f.airborneKnockdown = true;
      f.airSpeed = 0;
      f.stun = balance.maxAirHitstun;
      f.vx = o.facing * 2;
    }
    f.frame = 0;
    f.health = Math.max(
      0,
      f.health - Math.round(24 * difficultyTuning[o.difficulty].damage),
    );
    o.score += 240;
    o.combo++;
    o.comboDamage += 24;
    o.comboAge = 0;
    o.confirmed = true;
    const firstHit = !m.firstHit;
    m.firstHit = true;
    m.hitstop = 10;
    m.events.push({
      type: "counter",
      x: f.x,
      y: f.y - 100,
      damage: 24,
      player: (1 - c.attacker) as 0 | 1,
      strength: "counter",
      firstHit,
    });
    return;
  }
  if (!c.projectile) f.hit = true;
  const guarded = directionalGuard(o, f, d);
  const counter =
    c.counter ||
    (!guarded &&
      o.state === "attack" &&
      o.move !== null &&
      o.frame < combatMove(o, o.move).startup);
  const incomingArmour = o.move ? combatMove(o, o.move).armour : undefined;
  const armoured =
    o.state === "attack" &&
    incomingArmour &&
    o.frame >= incomingArmour[0] &&
    o.frame <= incomingArmour[1] &&
    d.level !== "grab";
  const shielded = o.guardFrames > 0 || armoured;
  const finalHit = !d.hitGap || f.frame - d.startup >= d.active - d.hitGap;
  const airborne = o.y < GROUND && !c.throwRelease;
  const scale = Math.max(
    balance.comboFloor,
    1 - Math.min(f.combo, balance.maxCombo) * balance.comboStep,
  );
  const damage = guarded
    ? 1
    : Math.max(
        1,
        Math.round(
          d.damage *
            fighterById(f.id, f.profile).power *
            scale *
            (airborne && c.move !== "super"
              ? balance.juggleDamage ** o.juggles
              : 1) *
            difficultyTuning[f.difficulty].damage *
            (counter ? 1.2 : 1) *
            (shielded ? 0.55 : 1),
        ),
      );
  o.health = Math.max(0, o.health - damage);
  f.meter = Math.min(
    100,
    f.meter + (guarded ? balance.meterOnGuard : balance.meterOnHit),
  );
  o.meter = Math.min(100, o.meter + balance.meterOnReceive);
  if (!guarded && c.move !== "super" && d.kind !== "super")
    f.superMeter = Math.min(100, f.superMeter + 10);
  f.score += damage * 10;
  if (!guarded) {
    f.confirmed = true;
    f.combo++;
    f.comboDamage += damage;
    f.comboAge = 0;
    o.received++;
    if (!armoured) {
      o.move = null;
      o.buffer = null;
      o.state = d.level === "grab" || o.received >= 6 ? "knockdown" : "hitstun";
      o.stun = d.stun + (counter ? 7 : 0);
      o.frame = 0;
      if (f.id === "frost") o.slowFrames = 100;
      const launch = d.launch && (c.move !== "super" || finalHit);
      if (airborne || launch) {
        const priorJuggles = o.juggles;
        o.juggles++;
        o.airborneKnockdown = true;
        o.airSpeed = 0;
        o.state = "airHit";
        o.stun = Math.min(balance.maxAirHitstun, o.stun);
        o.vy = launch
          ? -d.launch! / (1 + priorJuggles * 0.55)
          : Math.min(o.vy, -balance.juggleLift / Math.max(1, priorJuggles));
        o.y = Math.min(o.y, GROUND - 1);
        o.vx = f.facing * (d.launchX ?? Math.min(3, d.knockback / 6));
      }
    }
  } else {
    o.state = "block";
    o.stun =
      d.blockstun ??
      (c.move === "super" ? 14 : c.move.startsWith("heavy") ? 15 : 10);
    o.frame = 0;
  }
  if (!c.throwRelease && o.state !== "airHit")
    o.vx =
      f.facing *
      (guarded ? d.knockback * 0.4 : finalHit ? d.knockback : 3) *
      (1 - balance.groundDrag);
  m.hitstop = guarded
    ? 3
    : (d.hitstop ??
      (c.move === "super" ? 9 : c.move.startsWith("heavy") ? 8 : 4));
  const firstHit = !m.firstHit && !guarded;
  m.firstHit ||= !guarded;
  m.events.push({
    type: guarded ? "block" : counter ? "counter" : "hit",
    x: o.x - o.facing * 18,
    y: o.y - (d.level === "low" ? 35 : 105),
    damage,
    firstHit,
    player: c.attacker,
    move: c.move,
    strength: counter
      ? "counter"
      : c.move.startsWith("special") || c.move === "super"
        ? "special"
        : c.move.startsWith("heavy")
          ? "heavy"
          : "light",
  });
}
export function step(m: Match, inputs: [Input, Input]) {
  m.events = [];
  for (const f of m.fighters) {
    f.previousX = f.x;
    f.previousY = f.y;
  }
  m.tick++;
  m.phaseFrame++;
  if (m.phase === "matchOver") return;
  if (m.phase === "intro") {
    if (m.phaseFrame >= 100) {
      m.phase = "fight";
      m.phaseFrame = 0;
      m.events.push({ type: "fight", x: 400, y: 170 });
    }
    return;
  }
  if (m.phase === "roundOver") {
    // Finish existing trajectories without accepting new actions. A lethal
    // launcher must not leave the defeated fighter suspended until the reset.
    if (m.hitstop > 0) m.hitstop--;
    else
      for (const f of m.fighters) {
        f.animTick++;
        f.frame++;
        if (f.y < GROUND) {
          f.vy += airGravity(f);
          f.y = Math.min(GROUND, f.y + f.vy);
          f.x = clamp(f.x + f.airSpeed + f.vx);
          f.vx *= balance.launchDrag;
          if (f.y === GROUND) {
            f.vy = f.vx = f.airSpeed = 0;
            f.airTicks = f.juggles = 0;
            f.airborneKnockdown = false;
            m.events.push({
              type: "landing",
              x: f.x,
              y: GROUND,
              player: m.fighters.indexOf(f),
            });
          }
        }
      }
    if (m.phaseFrame >= 145) {
      if (m.fighters.some((f) => f.wins >= m.roundsToWin)) {
        m.phase = "matchOver";
        m.winner = m.fighters[0].wins >= m.roundsToWin ? 0 : 1;
      } else resetRound(m);
    }
    return;
  }
  // Sample fresh button edges even while simulation motion is frozen.
  // Hitstop is where a player most naturally buffers a cancel.
  for (let i = 0; i < 2; i++) {
    const fighter = m.fighters[i],
      input = inputs[i];
    const attack = readAttack(fighter, input);
    if (input.up && !fighter.previous.up)
      fighter.jumpBuffer = balance.jumpBufferTicks + 1;
    if (attack) fighter.buffer = { move: attack, age: 0 };
    fighter.previous = { ...input };
  }
  if (!activeSuper(m)) m.cinematic = 0;
  if (m.cinematic > 0) {
    m.cinematic--;
    return;
  }
  if (m.hitstop > 0) {
    m.hitstop--;
    return;
  }
  if (!m.training) m.timer--;
  if (m.throwSequence && updateThrow(m)) return;
  const [a, b] = m.fighters;
  const oldDirection = a.x <= b.x ? 1 : -1;
  const oldX = [a.x, b.x];
  updateFighter(m, a, inputs[0], 0);
  updateFighter(m, b, inputs[1], 1);
  if (a.x !== b.x) {
    if (
      a.y >= GROUND &&
      a.state !== "attack" &&
      (a.stun === 0 || a.state === "landing")
    )
      a.facing = a.x < b.x ? 1 : -1;
    if (
      b.y >= GROUND &&
      b.state !== "attack" &&
      (b.stun === 0 || b.state === "landing")
    )
      b.facing = b.x < a.x ? 1 : -1;
  }
  separateFighters(a, b, oldDirection);
  m.fighters.forEach((f, i) => {
    if (f.state === "walk" || f.state === "dash")
      f.walkDistance += Math.abs(f.x - oldX[i]);
  });
  const contacts: Contact[] = [];
  for (let i = 0; i < 2; i++) {
    const f = m.fighters[i],
      o = m.fighters[1 - i],
      box = activeHitbox(f);
    if (!box || f.hit || !f.move || !canContact(f, o)) continue;
    const data = combatMove(f, f.move);
    if (
      data.level === "grab" &&
      (o.y < GROUND || o.stun > 0 || o.throwImmunity > 0)
    )
      continue;
    if (overlaps(box, hurtbox(o)))
      contacts.push({ attacker: i as 0 | 1, data, move: f.move });
  }
  for (const p of m.projectiles) {
    p.life--;
    p.x += p.vx;
    const o = m.fighters[1 - p.owner];
    if (p.x < 0 || p.x > 800) p.life = 0;
    if (
      p.life > 0 &&
      canContact(m.fighters[p.owner], o) &&
      overlaps(
        { x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h },
        hurtbox(o),
      )
    ) {
      contacts.push({
        attacker: p.owner,
        data: p.data,
        move: p.move,
        projectile: p,
      });
      p.life = 0;
    }
  }
  for (let i = 0; i < m.projectiles.length; i++)
    for (let j = i + 1; j < m.projectiles.length; j++) {
      const p = m.projectiles[i],
        q = m.projectiles[j];
      if (
        p.life > 0 &&
        q.life > 0 &&
        p.owner !== q.owner &&
        Math.abs(p.x - q.x) < 30 &&
        Math.abs(p.y - q.y) < 40
      ) {
        p.life = q.life = 0;
        m.events.push({ type: "block", x: p.x, y: p.y });
      }
    }
  // Snapshot all contacts before resolution; normal simultaneous attacks trade.
  for (const c of contacts) applyContact(m, c);
  m.projectiles = m.projectiles.filter((p) => p.life > 0);
  if (m.training) {
    for (const f of m.fighters)
      if (f.health === 0) {
        f.health = f.maxHealth;
        f.stun = 0;
        f.state = "idle";
        f.y = GROUND;
        f.vy = f.vx = f.airSpeed = f.moveSpeed = 0;
        f.airTicks = f.juggles = f.jumpBuffer = 0;
        f.airborneKnockdown = false;
        f.move = null;
        f.buffer = null;
        f.previousY = GROUND;
        f.invuln = 20;
      }
    return;
  }
  if (a.health === 0 || b.health === 0 || m.timer <= 0) {
    m.phase = "roundOver";
    m.phaseFrame = 0;
    m.projectiles = [];
    const h0 = a.health / a.maxHealth,
      h1 = b.health / b.maxHealth,
      win = h0 === h1 ? "draw" : h0 > h1 ? 0 : 1;
    m.roundWinner = win;
    if (win !== "draw") {
      m.fighters[win].wins++;
      m.fighters[win].score += 1000;
    }
    m.fighters.forEach((f, i) => {
      f.state = win === "draw" ? "idle" : i === win ? "victory" : "defeat";
      f.move = null;
      f.frame = 0;
      f.buffer = null;
    });
    m.events.push({ type: "ko", x: 400, y: 160 });
  }
}

export const pushbox = (f: Fighter) => ({
  x: f.x - bodyWidths[f.id] / 2,
  y: f.y - balance.pushHeight,
  w: bodyWidths[f.id],
  h: balance.pushHeight,
});
export function separateFighters(a: Fighter, b: Fighter, direction: number) {
  if (
    Math.abs(a.y - b.y) >= balance.pushHeight ||
    a.state === "airHit" ||
    b.state === "airHit" ||
    (a.state === "knockdown" && b.y < GROUND) ||
    (b.state === "knockdown" && a.y < GROUND) ||
    a.state === "throwing" ||
    b.state === "throwing" ||
    a.state === "thrown" ||
    b.state === "thrown"
  )
    return;
  const distance = (bodyWidths[a.id] + bodyWidths[b.id]) / 2;
  if ((b.x - a.x) * direction >= distance) return;
  // Preserve order and redistribute correction when one fighter is pinned to a wall.
  const midpoint = (a.x + b.x) / 2;
  let left = Math.max(
    LEFT,
    Math.min(RIGHT - distance, midpoint - distance / 2),
  );
  left = Math.max(LEFT, left);
  if (direction > 0) {
    a.x = left;
    b.x = left + distance;
  } else {
    b.x = left;
    a.x = left + distance;
  }
}

export function combatMove(f: Fighter, move: MoveId): Move {
  const data = getMove(f.id, move, f.profile, f.bossPhase);
  const tuning = difficultyTuning[f.difficulty];
  if (f.profile === "boss" && tuning.warning) {
    data.startup += tuning.warning;
    data.recovery += tuning.heavyRest;
    if (data.bursts) data.bursts = 1;
  }
  return data;
}
