import { GROUND, type Fighter } from "../combat/engine";
export type MotionPhase =
  | "idle"
  | "walkForward"
  | "walkBackward"
  | "crouch"
  | "jumpStart"
  | "jumpAscent"
  | "jumpApex"
  | "jumpDescent"
  | "landing"
  | "airPunch"
  | "airKick"
  | "standingGuard"
  | "crouchingGuard"
  | "lightPunch"
  | "lightKick"
  | "heavyPunch"
  | "heavyKick"
  | "low"
  | "groundHit"
  | "launch"
  | "airHit"
  | "knockdown"
  | "getUp"
  | "attackRecovery"
  | "grab"
  | "throw"
  | "victory"
  | "defeat"
  | "special1"
  | "special2"
  | "special3"
  | "super";
export function motionPhase(f: Fighter): MotionPhase {
  if (f.state === "walk" || f.state === "dash")
    return f.moveSpeed * f.facing < 0 ? "walkBackward" : "walkForward";
  if (f.state === "jump")
    return f.airTicks <= 2
      ? "jumpStart"
      : f.vy < -1.5
        ? "jumpAscent"
        : f.vy <= 1.5
          ? "jumpApex"
          : "jumpDescent";
  if (f.state === "airHit") return f.vy < -3 ? "launch" : "airHit";
  if (f.state === "block")
    return f.previous.down ? "crouchingGuard" : "standingGuard";
  if (f.state === "hitstun") return f.y < GROUND ? "airHit" : "groundHit";
  if (f.state === "recovery") return f.stun > 0 ? "attackRecovery" : "getUp";
  if (f.state === "throwing") return "throw";
  if (f.state === "thrown") return "grab";
  if (f.state === "attack") {
    switch (f.move) {
      case "punch":
        return "lightPunch";
      case "kick":
        return "lightKick";
      case "airPunch":
        return "airPunch";
      case "air":
        return "airKick";
      case "heavyPunch":
        return "heavyPunch";
      case "heavyKick":
        return "heavyKick";
      case "low":
        return "low";
      case "grab":
        return "grab";
      case "special":
        return "special1";
      case "special2":
        return "special2";
      case "special3":
        return "special3";
      case "super":
        return "super";
    }
  }
  return f.state === "crouch" ||
    f.state === "landing" ||
    f.state === "knockdown" ||
    f.state === "victory" ||
    f.state === "defeat"
    ? f.state
    : "idle";
}
// One simulation-tick interpolation; attacks/state changes are shown immediately.
// Snap planted feet and externally reset fixtures, never interpolate a teleport.
export function renderPosition(f: Fighter, alpha = 1) {
  const t = Math.max(0, Math.min(1, alpha));
  return {
    x:
      Math.abs(f.x - f.previousX) > 40
        ? f.x
        : f.previousX + (f.x - f.previousX) * t,
    y:
      f.y === GROUND || Math.abs(f.y - f.previousY) > 40
        ? f.y
        : f.previousY + (f.y - f.previousY) * t,
  };
}
