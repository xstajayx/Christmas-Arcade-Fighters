// One complete illustration owns the ground; no independently scaled floor crop.
export function stageSource(stage: number) {
  if (stage >= 6) return { x: 0, y: (stage - 6) * 512, w: 1536, h: 512 };
  const row = Math.floor(stage / 2),
    top = Math.round((row * 1024) / 3),
    bottom = Math.round(((row + 1) * 1024) / 3);
  return { x: (stage % 2) * 768, y: top, w: 768, h: bottom - top };
}
export const giftFrame = (
  style: "rob" | "santa",
  age: number,
  impact = false,
) =>
  (style === "rob" ? 0 : 16) +
  (impact ? 8 + Math.min(7, Math.floor(age / 45)) : Math.floor(age / 80) % 8);
import { GROUND } from "../combat/engine";
// Physics remains at GROUND; the existing renderer adds 50 world units.
export const stageLayout = {
  width: 1020,
  height: 580,
  y: 225,
  floor: GROUND + 50,
};
// Authored walk lines below scenery/props in each original illustration.
const floorLines = [0.8, 0.82, 0.81, 0.82, 0.77, 0.8, 0.81, 0.8];
export function stageFloor(stage: number) {
  return {
    source: floorLines[stage] ?? 0.8,
    target: Math.round(
      ((stageLayout.floor - (stageLayout.y - stageLayout.height / 2)) /
        stageLayout.height) *
        450,
    ),
  };
}
