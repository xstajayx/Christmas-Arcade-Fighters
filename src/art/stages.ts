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
