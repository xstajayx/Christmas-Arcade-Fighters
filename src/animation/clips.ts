import type { Fighter } from "../combat/engine";
import { getMove } from "../fighters/data";
export const FRAME_WIDTH = 192,
  FRAME_HEIGHT = 256;
export const clips = {
  idle: [0, 1, 0, 1],
  forward: [40, 41, 42, 43, 44, 45, 46, 47],
  back: [47, 46, 45, 44, 43, 42, 41, 40],
  dash: [2, 3, 4, 5],
  jump: [7, 7, 17],
  landing: [6, 31, 0],
  crouch: [6],
  punch: [8, 9, 10, 11, 12, 13],
  kick: [16, 17, 18, 19, 20, 21],
  guard: [14],
  lowGuard: [15],
  hit: [22, 23, 22],
  fall: [23, 28, 29, 30],
  rise: [30, 28, 31, 6, 0],
  grab: [8, 26, 38, 39, 13],
  low: [6, 15, 32, 33, 34, 15],
  air: [35, 35, 36, 36, 37, 7],
  heavyPunch: [16, 9, 24, 25, 22, 13],
  heavyKick: [16, 6, 17, 19, 20, 21],
  special: [24, 24, 25, 25, 12, 13],
  victory: [0, 27, 27, 27],
  defeat: [23, 28, 29, 30],
} as const;
export function animationFrame(f: Fighter, tick: number = f.animTick) {
  let sequence: readonly number[] = clips.idle;
  let time = f.frame;
  let speed = 7;
  if (f.state === "idle") {
    sequence = clips.idle;
    time = tick;
    speed = 18;
  }
  if (f.state === "walk" || f.state === "dash") {
    const back =
      (f.previous.left && f.facing === 1) ||
      (f.previous.right && f.facing === -1);
    sequence =
      f.id === "frost"
        ? back
          ? [5, 4, 3, 2]
          : [2, 3, 4, 5]
        : back
          ? clips.back
          : clips.forward;
    time = tick;
    speed = f.state === "dash" ? 4 : f.id === "nash" ? 5 : 3;
  }
  if (f.state === "jump") {
    sequence = clips.jump;
    time = f.vy < 0 ? 0 : f.vy < 4 ? 7 : 14;
    speed = 7;
  }
  if (f.state === "landing") sequence = clips.landing;
  if (f.state === "crouch") sequence = clips.crouch;
  if (f.state === "block")
    sequence = f.previous.down ? clips.lowGuard : clips.guard;
  if (f.state === "hitstun") {
    sequence = f.stun > 24 ? clips.hit.slice().reverse() : clips.hit;
    speed = 5;
  }
  if (f.state === "knockdown") {
    sequence = clips.fall;
    speed = 7;
  }
  if (f.state === "recovery") {
    sequence = clips.rise;
    speed = 2;
  }
  if (f.state === "victory") {
    sequence =
      f.id === "bucket"
        ? [0, 27, 1, 27]
        : f.id === "nash"
          ? [8, 0, 27, 27]
          : f.id === "beardy"
            ? [14, 0, 27, 27]
            : clips.victory;
    speed = 14;
  }
  if (f.state === "defeat") {
    sequence = clips.defeat;
    speed = 9;
  }
  if (f.state === "attack" && f.move) {
    const move = getMove(f.id, f.move),
      kick = ["kick", "heavyKick", "low", "air"].includes(f.move);
    sequence =
      f.move === "grab" || move.kind === "throw"
        ? clips.grab
        : f.move.startsWith("special") || f.move === "super"
          ? clips.special
          : kick
            ? clips.kick
            : clips.punch;
    // Startup/contact/recovery map separately, so art never reaches contact before the hitbox.
    const phase =
      f.frame < move.startup
        ? Math.min(2, Math.floor((f.frame / move.startup) * 3))
        : f.frame < move.startup + move.active
          ? 3
          : Math.min(
              5,
              4 +
                Math.floor(
                  (f.frame - move.startup - move.active) /
                    Math.max(1, move.recovery / 2),
                ),
            );
    if (f.move === "low")
      return f.id === "frost" ? [6, 15, 6, 19, 20, 6][phase] : clips.low[phase];
    if (f.move === "air")
      return f.id === "frost" ? clips.kick[phase] : clips.air[phase];
    if (f.move === "heavyPunch") return clips.heavyPunch[phase];
    if (f.move === "heavyKick") return clips.heavyKick[phase];
    if (f.move.startsWith("special") || f.move === "super") {
      const row =
        f.move === "special"
          ? 0
          : f.move === "special2"
            ? 1
            : f.move === "special3"
              ? 2
              : 3;
      // Each signature has its own six genuine poses. Multi-hit Supers alternate
      // two contact poses on the same simulation clock as their impact cadence.
      const contact =
        f.move === "super" && phase === 3
          ? 3 +
            (Math.floor(
              (f.frame - move.startup) / Math.max(1, move.hitGap || 6),
            ) %
              2)
          : phase;
      return row * 6 + contact;
    }
    return sequence[Math.min(sequence.length - 1, phase)];
  }
  const loop = ["idle", "walk", "dash"].includes(f.state);
  return sequence[
    loop
      ? Math.floor(time / speed) % sequence.length
      : Math.min(sequence.length - 1, Math.floor(time / speed))
  ];
}
