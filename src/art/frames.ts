// Runtime atlas extraction, not collision geometry. Discard disconnected pixels
// that belong to a neighbouring generated cell; retain the fighter's body island.
export function isolateFrame(
  source: Uint8ClampedArray,
  w: number,
  h: number,
  anchorX: number,
) {
  const labels = new Int32Array(w * h),
    queue = new Int32Array(w * h);
  let label = 0,
    best = 0,
    bestScore = 0;
  const bounds: { left: number; right: number; top: number; bottom: number }[] =
    [];
  for (let start = 0; start < w * h; start++) {
    if (labels[start] || source[start * 4 + 3] < 24) continue;
    label++;
    let head = 0,
      tail = 1,
      count = 0;
    queue[0] = start;
    labels[start] = label;
    let left = w,
      right = 0,
      top = h,
      bottom = 0;
    const add = (n: number) => {
      if (!labels[n] && source[n * 4 + 3] >= 24) {
        labels[n] = label;
        queue[tail++] = n;
      }
    };
    while (head < tail) {
      const p = queue[head++],
        x = p % w,
        y = Math.floor(p / w);
      count++;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      if (x > 0) add(p - 1);
      if (x < w - 1) add(p + 1);
      if (y > 0) add(p - w);
      if (y < h - 1) add(p + w);
    }
    bounds[label] = { left, right, top, bottom };
    const distance = Math.abs((left + right) / 2 - anchorX),
      score = count / (1 + distance / w);
    if (score > bestScore) {
      best = label;
      bestScore = score;
    }
  }
  const b = bounds[best] || {
    left: anchorX,
    right: anchorX,
    top: 244,
    bottom: 244,
  };
  const pixels = new Uint8ClampedArray(256 * 256 * 4),
    dx = Math.max(-b.left, Math.min(255 - b.right, Math.round(128 - anchorX))),
    dy = Math.max(-b.top, 244 - b.bottom);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      // One pixel fringe keeps antialiased edge colours without admitting islands.
      let own = labels[p] === best;
      if (!own && source[p * 4 + 3] > 0)
        own =
          (x > 0 && labels[p - 1] === best) ||
          (x < w - 1 && labels[p + 1] === best) ||
          (y > 0 && labels[p - w] === best) ||
          (y < h - 1 && labels[p + w] === best);
      const tx = x + dx,
        ty = y + dy;
      if (own && tx >= 0 && tx < 256 && ty >= 0 && ty < 256) {
        const dst = (ty * 256 + tx) * 4;
        pixels[dst] = source[p * 4];
        pixels[dst + 1] = source[p * 4 + 1];
        pixels[dst + 2] = source[p * 4 + 2];
        pixels[dst + 3] = source[p * 4 + 3];
      }
    }
  return {
    pixels,
    bounds: {
      x: b.left + dx,
      y: b.top + dy,
      w: b.right - b.left + 1,
      h: b.bottom - b.top + 1,
    },
    pivot: { x: anchorX + dx, y: b.bottom + dy },
    offset: { x: dx, y: dy },
  };
}
