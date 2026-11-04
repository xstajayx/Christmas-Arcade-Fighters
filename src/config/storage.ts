import type { Difficulty } from "../ai/cpu";
export interface Settings {
  music: number;
  effects: number;
  muted: boolean;
  difficulty: Difficulty;
  controlSize: number;
  reduced: boolean;
  keys: Record<string, string>;
}
export interface Save {
  version: 1;
  settings: Settings;
  highScore: number;
  arcadeWins: number;
  progress: number;
  tutorial: boolean;
  unlocked: string[];
}
export const defaultKeys = {
  left: "KeyA",
  right: "KeyD",
  up: "KeyW",
  down: "KeyS",
  punch: "KeyJ",
  kick: "KeyK",
  block: "KeyL",
  special: "KeyI",
  grab: "KeyU",
};
export const defaults = (): Save => ({
  version: 1,
  settings: {
    music: 0.25,
    effects: 0.5,
    muted: false,
    difficulty: "normal",
    controlSize: 1,
    reduced: false,
    keys: { ...defaultKeys },
  },
  highScore: 0,
  arcadeWins: 0,
  progress: 0,
  tutorial: false,
  unlocked: ["jamie", "nash", "bucket", "beardy"],
});
export function loadSave(): Save {
  const d = defaults();
  try {
    const s = JSON.parse(localStorage.getItem("caf-save") || "null");
    if (s?.version !== 1) return d;
    const v = s.settings;
    if (v && typeof v === "object") {
      for (const key of ["music", "effects", "controlSize"] as const)
        if (typeof v[key] === "number" && Number.isFinite(v[key]))
          d.settings[key] = Math.max(
            key === "controlSize" ? 0.7 : 0,
            Math.min(key === "controlSize" ? 1.3 : 1, v[key]),
          );
      if (["easy", "normal", "hard"].includes(v.difficulty))
        d.settings.difficulty = v.difficulty;
      for (const key of ["muted", "reduced"] as const)
        if (typeof v[key] === "boolean") d.settings[key] = v[key];
      if (
        v.keys &&
        Object.keys(defaultKeys).every(
          (k) =>
            typeof v.keys[k] === "string" &&
            /^(Key[A-Z]|Digit[0-9]|Space|Shift(Left|Right))$/.test(v.keys[k]),
        ) &&
        new Set(Object.values(v.keys)).size === 9
      )
        d.settings.keys = { ...v.keys };
    }
    for (const key of ["highScore", "arcadeWins", "progress"] as const)
      if (Number.isSafeInteger(s[key]) && s[key] >= 0)
        d[key] = key === "progress" ? Math.min(s[key], 3) : s[key];
    d.tutorial = s.tutorial === true;
    return d;
  } catch {
    return d;
  }
}
export function persist(save: Save) {
  try {
    localStorage.setItem("caf-save", JSON.stringify(save));
  } catch {
    /* Storage may be unavailable in private browsing. Gameplay remains available. */
  }
}
