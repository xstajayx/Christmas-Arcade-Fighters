import { it, expect, vi } from "vitest";
import { loadSave, persist, defaults } from "../src/config/storage";
it("recovers from corrupt and incompatible storage", () => {
  vi.stubGlobal("localStorage", { getItem: () => "{broken" });
  expect(loadSave()).toEqual(defaults());
  vi.stubGlobal("localStorage", { getItem: () => '{"version":500}' });
  expect(loadSave()).toEqual(defaults());
});
it("validates settings and tolerates unavailable writes", () => {
  vi.stubGlobal("localStorage", {
    getItem: () =>
      JSON.stringify({
        version: 1,
        settings: {
          music: 100,
          difficulty: "impossible",
          keys: { left: "<script>" },
        },
        progress: 999,
        highScore: -3,
      }),
    setItem: () => {
      throw new Error("denied");
    },
  });
  const s = loadSave();
  expect(s.settings.music).toBe(1);
  expect(s.settings.difficulty).toBe("normal");
  expect(s.progress).toBe(5);
  expect(s.highScore).toBe(0);
  expect(() => persist(s)).not.toThrow();
});
it("migrates old controls and preserves a validated resumed campaign", () => {
  vi.stubGlobal("localStorage", {
    getItem: () =>
      JSON.stringify({
        version: 1,
        settings: { keys: { left: "KeyA", right: "KeyD" } },
        progress: 4,
        campaign: { fighter: "bucket", index: 5, score: 4200, continues: 1 },
      }),
  });
  const s = loadSave();
  expect(s.version).toBe(2);
  expect(s.settings.keys.super).toBe("Space");
  expect(s.settings.keys.special2).toBe("KeyO");
  expect(new Set(Object.values(s.settings.keys)).size).toBe(12);
  expect(s.campaign).toMatchObject({
    fighter: "bucket",
    index: 5,
    score: 4200,
    continues: 1,
  });
});
it("rejects injected leaderboard entries and invalid campaign indices", () => {
  const scores = Array.from({ length: 15 }, (_, score) => ({
    fighter: "jamie",
    mode: "arcade",
    score,
    result: "victory",
    bouts: 1,
  }));
  vi.stubGlobal("localStorage", {
    getItem: () =>
      JSON.stringify({
        version: 2,
        scores: [
          ...scores,
          {
            fighter: "<script>",
            mode: "arcade",
            score: 99999,
            result: "champion",
            bouts: 6,
          },
        ],
        campaign: { fighter: "jamie", index: 6, score: 99, continues: 3 },
      }),
  });
  const s = loadSave();
  expect(s.scores).toHaveLength(10);
  expect(s.scores.map((x) => x.score)).toEqual([
    14, 13, 12, 11, 10, 9, 8, 7, 6, 5,
  ]);
  expect(s.campaign).toBeNull();
});
