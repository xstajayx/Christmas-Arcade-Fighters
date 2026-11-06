import type { Fighter } from "../combat/engine";
export interface Framing {
  x: number;
  y: number;
  zoom: number;
  bounds?: { left: number; right: number; top: number; bottom: number };
}
export const initialFraming = (): Framing => ({ x: 400, y: 240, zoom: 1.25 });
export function targetFraming(
  fighters: readonly Fighter[],
  visuals: readonly {
    x: number;
    y: number;
    width: number;
    height: number;
  }[] = [],
): Framing {
  const left = Math.min(
      ...fighters.map((f) => f.x - 120),
      ...visuals.map((b) => b.x),
    ),
    right = Math.max(
      ...fighters.map((f) => f.x + 120),
      ...visuals.map((b) => b.x + b.width),
    );
  const top = Math.min(
      ...fighters.map((f) => f.y + 50 - 190),
      ...visuals.map((b) => b.y),
    ),
    bottom = Math.max(
      ...fighters.map((f) => f.y + 65),
      ...visuals.map((b) => b.y + b.height),
    );
  const zoom = Math.max(
    0.82,
    Math.min(1.28, 800 / (right - left + 50), 450 / (bottom - top + 44)),
  );
  const halfW = 400 / zoom,
    halfH = 225 / zoom;
  return {
    zoom,
    bounds: { left, right, top, bottom },
    x: Math.max(-90 + halfW, Math.min(890 - halfW, (left + right) / 2)),
    y: Math.max(-60 + halfH, Math.min(500 - halfH, (top + bottom) / 2 + 8)),
  };
}
export function followFraming(
  current: Framing,
  target: Framing,
  delta: number,
  reduced = false,
): Framing {
  // Expand immediately enough to guarantee bodies stay visible; contract slowly.
  const k = 1 - Math.exp(-Math.min(delta, 100) / (reduced ? 240 : 160));
  const zoom =
    target.zoom < current.zoom
      ? target.zoom
      : current.zoom + (target.zoom - current.zoom) * k;
  let x = current.x + (target.x - current.x) * k,
    y = current.y + (target.y - current.y) * k;
  if (target.bounds) {
    const b = target.bounds,
      hw = 400 / zoom,
      hh = 225 / zoom;
    x = Math.max(b.right - hw, Math.min(b.left + hw, x));
    y = Math.max(b.bottom - hh, Math.min(b.top + hh, y));
    x = Math.max(-90 + hw, Math.min(890 - hw, x));
    y = Math.max(-60 + hh, Math.min(500 - hh, y));
  }
  return { x, y, zoom };
}
