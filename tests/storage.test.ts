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
  expect(s.progress).toBe(3);
  expect(s.highScore).toBe(0);
  expect(() => persist(s)).not.toThrow();
});
