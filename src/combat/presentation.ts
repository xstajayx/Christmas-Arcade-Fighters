import type { Match } from "./engine";
// No callbacks: presentation cannot outlive the attack or be restored by an old timer.
export function activeSuper(m: Match | null) {
  if (!m || m.phase !== "fight" || m.fighters.some((f) => f.health <= 0))
    return undefined;
  return m.fighters.find((f) => f.state === "attack" && f.move === "super");
}
