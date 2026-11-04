import {
  fighterById,
  getMove,
  type FighterId,
  type MoveId,
} from "../fighters/data";
export type State =
  | "idle"
  | "walk"
  | "crouch"
  | "jump"
  | "attack"
  | "block"
  | "hitstun"
  | "knockdown"
  | "recovery"
  | "victory"
  | "defeat";
export interface Input {
  left?: boolean;
  right?: boolean;
  up?: boolean;
  down?: boolean;
  punch?: boolean;
  kick?: boolean;
  block?: boolean;
  special?: boolean;
  grab?: boolean;
}
export interface Fighter {
  id: FighterId;
  x: number;
  y: number;
  vy: number;
  facing: 1 | -1;
  health: number;
  meter: number;
  state: State;
  frame: number;
  move: MoveId | null;
  hit: boolean;
  stun: number;
  combo: number;
  comboAge: number;
  juggles: number;
  buffer: { move: MoveId; age: number } | null;
  previous: Input;
  previousJump?: boolean;
  wins: number;
  score: number;
}
export interface CombatEvent {
  type: "hit" | "block" | "jump" | "special" | "ko" | "round" | "fight";
  x: number;
  y: number;
  damage?: number;
  player?: number;
}
export type Phase = "intro" | "fight" | "roundOver" | "matchOver";
export interface Match {
  fighters: [Fighter, Fighter];
  tick: number;
  timer: number;
  round: number;
  phase: Phase;
  phaseFrame: number;
  hitstop: number;
  winner: 0 | 1 | "draw" | null;
  roundWinner: 0 | 1 | "draw" | null;
  events: CombatEvent[];
  training: boolean;
}
export const GROUND = 300,
  LEFT = 45,
  RIGHT = 755;
function makeFighter(id: FighterId, x: number, facing: 1 | -1): Fighter {
  return {
    id,
    x,
    y: GROUND,
    vy: 0,
    facing,
    health: fighterById(id).health,
    meter: 20,
    state: "idle",
    frame: 0,
    move: null,
    hit: false,
    stun: 0,
    combo: 0,
    comboAge: 0,
    juggles: 0,
    buffer: null,
    previous: {},
    wins: 0,
    score: 0,
  };
}
export function createMatch(
  a: FighterId,
  b: FighterId,
  training = false,
): Match {
  return {
    fighters: [makeFighter(a, 245, 1), makeFighter(b, 555, -1)],
    tick: 0,
    timer: 99 * 60,
    round: 1,
    phase: "intro",
    phaseFrame: 0,
    hitstop: 0,
    winner: null,
    roundWinner: null,
    events: [],
    training,
  };
}
export function resetRound(m: Match) {
  const old = m.fighters;
  m.fighters = [
    makeFighter(old[0].id, 245, 1),
    makeFighter(old[1].id, 555, -1),
  ];
  m.fighters.forEach((f, i) => {
    f.wins = old[i].wins;
    f.score = old[i].score;
    f.meter = old[i].meter;
  });
  m.round++;
  m.timer = 99 * 60;
  m.phase = "intro";
  m.phaseFrame = 0;
  m.roundWinner = null;
}
export const activeHitbox = (f: Fighter) => {
  if (f.state !== "attack" || !f.move) return null;
  const m = getMove(f.id, f.move);
  if (f.frame < m.startup || f.frame >= m.startup + m.active) return null;
  return {
    x: f.x + (f.facing === 1 ? 13 : -13 - m.range * fighterById(f.id).reach),
    y: f.y - (m.level === "low" ? 55 : m.level === "air" ? 150 : 125),
    w: m.range * fighterById(f.id).reach,
    h: m.level === "low" ? 55 : 80,
  };
};
export const hurtbox = (f: Fighter) => ({
  x: f.x - 24,
  y: f.y - (f.state === "crouch" ? 125 : 167),
  w: 48,
  h: f.state === "crouch" ? 125 : 167,
});
export function overlaps(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}
const controllable = (f: Fighter) =>
  ["idle", "walk", "crouch", "jump", "block"].includes(f.state);
function startMove(m: Match, f: Fighter, move: MoveId, index: number) {
  const data = getMove(f.id, move);
  if (f.meter < data.cost) return false;
  f.meter -= data.cost;
  f.move = move;
  f.state = "attack";
  f.frame = 0;
  f.hit = false;
  f.buffer = null;
  if (move === "special")
    m.events.push({ type: "special", x: f.x, y: f.y - 50, player: index });
  return true;
}
function updateFighter(m: Match, f: Fighter, input: Input, index: number) {
  const def = fighterById(f.id);
  f.frame++;
  f.comboAge++;
  if (f.comboAge > 80) f.combo = 0;
  const grounded = f.y >= GROUND;
  if (f.buffer && ++f.buffer.age > 9) f.buffer = null;
  for (const key of ["special", "grab", "kick", "punch"] as const) {
    if (input[key] && !f.previous[key]) {
      f.buffer = {
        move:
          key === "punch" || key === "kick"
            ? grounded
              ? input.down
                ? "low"
                : key
              : "air"
            : key,
        age: 0,
      };
      break;
    }
  }
  f.previous = { ...input };
  if (f.stun > 0) {
    f.stun--;
    if (f.stun === 0) {
      f.state = grounded ? "recovery" : "jump";
      f.frame = 0;
    }
  } else if (f.state === "recovery" && f.frame >= 9) {
    f.state = "idle";
    f.frame = 0;
  } else if (f.state === "attack" && f.move) {
    const move = getMove(f.id, f.move);
    if (f.frame >= move.startup + move.active + move.recovery) {
      f.state = grounded ? "idle" : "jump";
      f.move = null;
      f.frame = 0;
    } else if (
      move.dash &&
      f.frame >= move.startup &&
      f.frame < move.startup + move.active
    )
      f.x += move.dash * f.facing;
  }
  if (controllable(f)) {
    if (f.buffer) startMove(m, f, f.buffer.move, index);
    if (f.state !== "attack") {
      if (grounded && input.up && !f.previousJump) {
        f.vy = -8.8;
        f.state = "jump";
        f.frame = 0;
        m.events.push({ type: "jump", x: f.x, y: f.y, player: index });
      } else if (grounded) {
        f.state = input.block
          ? "block"
          : input.down
            ? "crouch"
            : input.left !== input.right && (input.left || input.right)
              ? "walk"
              : "idle";
      }
      if (!input.block && !input.down)
        f.x +=
          ((input.right ? 1 : 0) - (input.left ? 1 : 0)) *
          def.speed *
          (grounded ? 1 : 0.72);
    }
  }
  f.previousJump = !!input.up;
  if (f.y < GROUND || f.vy < 0) {
    f.vy += 0.43;
    f.y += f.vy;
    if (f.y >= GROUND) {
      f.y = GROUND;
      f.vy = 0;
      f.juggles = 0;
      if (f.state === "jump") f.state = "idle";
    }
  }
  f.x = Math.max(LEFT, Math.min(RIGHT, f.x));
}
export function step(m: Match, inputs: [Input, Input]) {
  m.events = [];
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
    if (m.phaseFrame >= 145) {
      if (m.fighters.some((f) => f.wins >= 2)) {
        m.phase = "matchOver";
        m.winner = m.fighters[0].wins >= 2 ? 0 : 1;
      } else resetRound(m);
    }
    return;
  }
  if (m.hitstop > 0) {
    m.hitstop--;
    return;
  }
  if (!m.training) m.timer--;
  const [a, b] = m.fighters;
  for (let i = 0; i < 2; i++) updateFighter(m, m.fighters[i], inputs[i], i);
  if (a.x !== b.x && a.state !== "attack" && a.stun === 0)
    a.facing = a.x < b.x ? 1 : -1;
  if (a.x !== b.x && b.state !== "attack" && b.stun === 0)
    b.facing = b.x < a.x ? 1 : -1;
  if (Math.abs(a.x - b.x) < 39 && Math.abs(a.y - b.y) < 65) {
    const dir = a.x <= b.x ? 1 : -1;
    const push = (39 - Math.abs(a.x - b.x)) / 2;
    a.x = Math.max(LEFT, Math.min(RIGHT, a.x - push * dir));
    b.x = Math.max(LEFT, Math.min(RIGHT, b.x + push * dir));
  }
  // Snapshot contacts before applying damage: trades resolve symmetrically.
  const hits = m.fighters.map((f, i) => {
    const box = activeHitbox(f),
      other = m.fighters[1 - i];
    if (
      !box ||
      f.hit ||
      other.health <= 0 ||
      other.state === "knockdown" ||
      other.state === "recovery"
    )
      return null;
    const move = getMove(f.id, f.move!);
    if (move.level === "grab" && (other.y < GROUND || other.stun > 0))
      return null;
    if (other.juggles >= 3 && other.y < GROUND) return null;
    return overlaps(box, hurtbox(other))
      ? {
          attacker: i,
          move,
          blocked:
            move.level !== "grab" &&
            other.state === "block" &&
            other.y === GROUND &&
            inputs[1 - i].block &&
            (move.level === "low" ? !!inputs[1 - i].down : !inputs[1 - i].down),
        }
      : null;
  });
  for (const hit of hits) {
    if (!hit) continue;
    const f = m.fighters[hit.attacker],
      o = m.fighters[1 - hit.attacker];
    f.hit = true;
    const damage = hit.blocked
      ? 1
      : Math.max(
          1,
          Math.round(
            hit.move.damage *
              fighterById(f.id).power *
              (1 - Math.min(f.combo, 6) * 0.09),
          ),
        );
    o.health = Math.max(0, o.health - damage);
    f.meter = Math.min(100, f.meter + (hit.blocked ? 3 : 8));
    o.meter = Math.min(100, o.meter + 5);
    f.score += damage * 10;
    if (!hit.blocked) {
      f.combo++;
      f.comboAge = 0;
      o.move = null;
      o.buffer = null;
      o.state = hit.move.level === "grab" ? "knockdown" : "hitstun";
      o.stun = hit.move.stun;
      o.frame = 0;
      if (hit.move.launch && o.juggles < 3) {
        o.vy = -hit.move.launch;
        o.y -= 1;
        o.juggles++;
      }
    } else {
      o.state = "block";
      o.stun = 8;
      o.frame = 0;
    }
    o.x = Math.max(LEFT, Math.min(RIGHT, o.x + f.facing * hit.move.knockback));
    m.hitstop = hit.blocked ? 3 : 7;
    m.events.push({
      type: hit.blocked ? "block" : "hit",
      x: (f.x + o.x) / 2,
      y: o.y - 50,
      damage,
      player: hit.attacker,
    });
  }
  if (m.training) {
    for (const f of m.fighters) {
      if (f.health === 0) {
        f.health = fighterById(f.id).health;
        f.stun = 0;
        f.state = "idle";
        f.y = GROUND;
        f.vy = 0;
      }
    }
    return;
  }
  if (a.health === 0 || b.health === 0 || m.timer <= 0) {
    m.phase = "roundOver";
    m.phaseFrame = 0;
    const h0 = a.health / fighterById(a.id).health,
      h1 = b.health / fighterById(b.id).health;
    const win = h0 === h1 ? "draw" : h0 > h1 ? 0 : 1;
    m.roundWinner = win;
    if (win !== "draw") {
      m.fighters[win].wins++;
      m.fighters[win].score += 1000;
    }
    m.fighters.forEach((f, i) => {
      f.state = win === "draw" ? "idle" : i === win ? "victory" : "defeat";
      f.move = null;
      f.frame = 0;
    });
    m.events.push({ type: "ko", x: 400, y: 160 });
  }
}
