import { motionPhase } from "./motion";
import { balance } from "../combat/balance";
import type { Fighter } from "../combat/engine";
import { combatMove } from "../combat/engine";
export const FRAME_WIDTH = 192,
  FRAME_HEIGHT = 256;
export const clips = {
  idle: [0, 1, 0, 1],
  forward: [40, 41, 42, 43, 44, 45, 46, 47],
  back: [47, 46, 45, 44, 43, 42, 41, 40],
  dash: [2, 3, 4, 5],
  jump: [7],
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
  // No authored uppercut cycle exists yet; use the coherent punch cycle.
  heavyPunch: [8, 9, 10, 11, 12, 13],
  heavyKick: [16, 17, 18, 19, 20, 21],
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
      f.moveSpeed !== 0
        ? f.moveSpeed * f.facing < 0
        : (f.previous.left && f.facing === 1) ||
          (f.previous.right && f.facing === -1);
    sequence = ["frost", "rob", "santa"].includes(f.id)
      ? back
        ? [5, 4, 3, 2]
        : [2, 3, 4, 5]
      : back
        ? clips.back
        : clips.forward;
    if (f.state === "dash") sequence = clips.dash;
    time = f.walkDistance;
    speed = balance.strideDistance / sequence.length;
  }
  if (f.state === "jump") {
    // The source only has one genuine free-jump pose. Keep distinct logical
    // phases, without substituting standing kicks for missing descent artwork.
    return motionPhase(f) === "jumpStart" ? 6 : 7;
  }
  if (f.state === "landing")
    return clips.landing[
      Math.min(2, Math.floor(f.frame / Math.max(1, (f.frame + f.stun) / 3)))
    ];
  if (f.state === "crouch") sequence = clips.crouch;
  if (f.state === "block")
    sequence = f.previous.down ? clips.lowGuard : clips.guard;
  if (f.state === "hitstun") {
    sequence = [22, 23];
    speed = 5;
  }
  if (f.state === "airHit") {
    sequence = [23, 29, 30];
    speed = 6;
  }
  if (f.state === "knockdown") {
    sequence = clips.fall;
    speed = 7;
  }
  if (f.state === "recovery") {
    // Throws/throw breaks recover while standing (stun > 0). Only a completed
    // knockdown enters this state with zero stun and needs the get-up sequence.
    sequence = f.stun > 0 ? [13, 0] : clips.rise;
    speed = f.stun > 0 ? 4 : 2;
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
  if (f.state === "throwing") {
    if (f.id === "rob") return 12 + Math.min(5, Math.floor(f.frame / 4));
    if (f.move?.startsWith("special"))
      return (
        (f.move === "special2" ? 6 : 12) + Math.min(5, Math.floor(f.frame / 4))
      );
    return ["frost", "santa"].includes(f.id)
      ? [26, 14, 27, 13][Math.min(3, Math.floor(f.frame / 7))]
      : [26, 38, 38, 39][Math.min(3, Math.floor(f.frame / 7))];
  }
  // Braced contact -> recoil joins fall[0] at release without jump/seated torso snaps.
  if (f.state === "thrown") return f.frame < 8 ? 22 : 23;
  if (f.state === "defeat") {
    sequence = clips.defeat;
    speed = 9;
  }
  if (f.state === "attack" && f.move) {
    const move = combatMove(f, f.move),
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
      return ["frost", "rob", "santa"].includes(f.id)
        ? [6, 15, 6, 19, 20, 6][phase]
        : clips.low[phase];
    // A dedicated airborne punch sheet is missing: retain the genuine guarded
    // jump pose, with real hitbox/sparks, instead of faking a kick as a punch.
    if (f.move === "airPunch")
      return ["frost", "rob", "santa"].includes(f.id) ? 7 : 35;
    if (f.move === "air")
      return ["frost", "rob", "santa"].includes(f.id)
        ? clips.kick[phase]
        : clips.air[phase];
    if (f.move === "heavyPunch") return clips.heavyPunch[phase];
    if (f.move === "heavyKick") return clips.heavyKick[phase];
    if (f.move.startsWith("special") || f.move === "super") {
      const row =
        combatMove(f, f.move).poseRow ??
        (f.move === "special"
          ? 0
          : f.move === "special2"
            ? 1
            : f.move === "special3"
              ? 2
              : 3);
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
