import type { Fighter } from "../combat/engine";
export interface SafeArea {
  top: number;
  bottom: number;
  left: number;
  right: number;
}
export interface Framing {
  x: number;
  y: number;
  zoom: number;
  bounds?: { left: number; right: number; top: number; bottom: number };
  safe?: SafeArea;
}
export const initialFraming = (): Framing => ({ x: 400, y: 260, zoom: 1.35 });
export function targetFraming(
  fighters: readonly Fighter[],
  visuals: readonly {
    x: number;
    y: number;
    width: number;
    height: number;
  }[] = [],
  safe: SafeArea = { top: 62, bottom: 54, left: 20, right: 20 },
): Framing {
  const left = visuals.length
      ? Math.min(...visuals.map((b) => b.x)) - 8
      : Math.min(...fighters.map((f) => f.x - 90)),
    right = visuals.length
      ? Math.max(...visuals.map((b) => b.x + b.width)) + 8
      : Math.max(...fighters.map((f) => f.x + 90));
  const top = visuals.length
      ? Math.min(...visuals.map((b) => b.y)) - 8
      : Math.min(...fighters.map((f) => f.y + 50 - 170)),
    bottom = visuals.length
      ? Math.max(...visuals.map((b) => b.y + b.height)) + 8
      : Math.max(...fighters.map((f) => f.y + 58));
  const zoom = Math.max(
    0.78,
    Math.min(
      1.52,
      (800 - safe.left - safe.right) / (right - left),
      (450 - safe.top - safe.bottom) / (bottom - top),
    ),
  );
  const hw = 400 / zoom,
    hh = 225 / zoom;
  return {
    zoom,
    bounds: { left, right, top, bottom },
    safe,
    x: Math.max(-90 + hw, Math.min(890 - hw, (left + right) / 2)),
    y: Math.max(
      -60 + hh,
      Math.min(
        500 - hh,
        (top + bottom) / 2 + (safe.bottom - safe.top) / (2 * zoom),
      ),
    ),
  };
}
export function followFraming(
  current: Framing,
  target: Framing,
  delta: number,
  reduced = false,
): Framing {
  const k = 1 - Math.exp(-Math.min(delta, 100) / (reduced ? 240 : 180));
  const zoom =
    target.zoom < current.zoom
      ? target.zoom
      : current.zoom + (target.zoom - current.zoom) * k;
  let x = current.x + (target.x - current.x) * k,
    y = current.y + (target.y - current.y) * k;
  if (target.bounds) {
    const b = target.bounds,
      s = target.safe ?? { left: 0, right: 0, top: 0, bottom: 0 },
      hw = 400 / zoom,
      hh = 225 / zoom;
    x = Math.max(
      b.right - (400 - s.right) / zoom,
      Math.min(b.left + (400 - s.left) / zoom, x),
    );
    y = Math.max(
      b.bottom - (225 - s.bottom) / zoom,
      Math.min(b.top + (225 - s.top) / zoom, y),
    );
    x = Math.max(-90 + hw, Math.min(890 - hw, x));
    y = Math.max(-60 + hh, Math.min(500 - hh, y));
  }
  return { x, y, zoom };
}
