import profiles from "../art/legacy-contact.json" with { type: "json" };
import type { FighterId, MoveId } from "../fighters/data";
// Calibrated at native resolution from the opaque fist/boot in the authored
// ACTIVE pose, then converted with the legacy 0.75 world scale. Never camera scale.
// HD artwork must match these world-space contact landmarks.
export type StrikeContact = { reach: number; height: number };
const frameFor = (move: MoveId) =>
  (
    ({
      punch: 11,
      heavyPunch: 11,
      kick: 19,
      heavyKick: 19,
      grab: 26,
      low: 33,
      air: 36,
      airPunch: 35,
    }) as Partial<Record<MoveId, number>>
  )[move];
export function strikeContact(
  id: FighterId,
  move: MoveId,
): StrikeContact | undefined {
  let frame = frameFor(move);
  if (frame === undefined) return;
  if (["rob", "santa", "frost"].includes(id)) {
    if (move === "low") frame = 19;
    if (move === "air") frame = 19;
    if (move === "airPunch") return; // Dedicated artwork still missing.
  }
  return (profiles[id] as Record<string, StrikeContact>)[frame];
}
// Torso widths, not the span of outstretched arms or the stance's two boots.
export const torsoWidth: Record<FighterId, number> = {
  jamie: 68,
  beardy: 70,
  nash: 74,
  bucket: 72,
  frost: 68,
  rob: 78,
  santa: 78,
};
