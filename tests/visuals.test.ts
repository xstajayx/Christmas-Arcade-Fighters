import { it, expect } from "vitest";
import { stageSource, giftFrame } from "../src/art/stages";
it("stage source rectangles tile their masters exactly without duplicated floor crops", () => {
  for (let i = 0; i < 6; i++) {
    const r = stageSource(i);
    expect(r.x).toBe((i % 2) * 768);
    expect(r.y + r.h).toBeLessThanOrEqual(1024);
  }
  expect([0, 2, 4].reduce((n, i) => n + stageSource(i).h, 0)).toBe(1024);
  expect(stageSource(6)).toEqual({ x: 0, y: 0, w: 1536, h: 512 });
  expect(stageSource(7)).toEqual({ x: 0, y: 512, w: 1536, h: 512 });
});
it("boss flight cycles and finite impact frames stay in their own atlas rows", () => {
  for (const [style, start] of [
    ["rob", 0],
    ["santa", 16],
  ] as const) {
    for (let age = 0; age < 2000; age += 16) {
      expect(giftFrame(style, age)).toBeGreaterThanOrEqual(start);
      expect(giftFrame(style, age)).toBeLessThan(start + 8);
    }
    expect(giftFrame(style, 0, true)).toBe(start + 8);
    expect(giftFrame(style, 360, true)).toBe(start + 15);
  }
});
