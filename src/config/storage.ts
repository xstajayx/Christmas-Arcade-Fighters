import type { Difficulty } from "../ai/cpu";
import { route, type Campaign } from "../progression/campaign";
import type { FighterId } from "../fighters/data";
export interface Settings {
  music: number;
  effects: number;
  announcer: number;
  muted: boolean;
  difficulty: Difficulty;
  controlSize: number;
  controlOpacity: number;
  controlInset: number;
  controlLift: number;
  vibration: boolean;
  speechFallback: boolean;
  reduced: boolean;
  compact: boolean;
  leftHanded: boolean;
  keys: Record<string, string>;
}
export interface Score {
  fighter: FighterId;
  mode: string;
  score: number;
  result: string;
  bouts: number;
}
export interface Save {
  version: 3;
  settings: Settings;
  highScore: number;
  arcadeWins: number;
  progress: number;
  tutorial: boolean;
  unlocked: string[];
  scores: Score[];
  campaign: Campaign | null;
  badges: string[];
}
export const defaultKeys = {
  left: "KeyA",
  right: "KeyD",
  up: "KeyW",
  down: "KeyS",
  punch: "KeyJ",
  kick: "KeyK",
  special: "KeyI",
  grab: "KeyU",
  special2: "KeyO",
  special3: "KeyP",
  super: "Space",
};
export const defaults = (): Save => ({
  version: 3,
  settings: {
    music: 0.25,
    effects: 0.5,
    announcer: 0.65,
    muted: false,
    difficulty: "normal",
    controlSize: 1,
    controlOpacity: 0.82,
    controlInset: 0,
    controlLift: 0,
    vibration: false,
    speechFallback: false,
    reduced: false,
    compact: false,
    leftHanded: false,
    keys: { ...defaultKeys },
  },
  highScore: 0,
  arcadeWins: 0,
  progress: 0,
  tutorial: false,
  unlocked: ["jamie", "nash", "bucket", "beardy"],
  scores: [],
  campaign: null,
  badges: [],
});
const ids = ["jamie", "nash", "bucket", "beardy", "rob", "santa"];
export function loadSave(): Save {
  const d = defaults();
  try {
    const s = JSON.parse(localStorage.getItem("caf-save") || "null");
    if (![1, 2, 3].includes(s?.version)) return d;
    const v = s.settings;
    if (v && typeof v === "object") {
      for (const [key, min, max] of [
        ["music", 0, 1],
        ["effects", 0, 1],
        ["announcer", 0, 1],
        ["controlSize", 0.7, 1.3],
        ["controlOpacity", 0.2, 1],
        ["controlInset", 0, 60],
        ["controlLift", 0, 60],
      ] as const)
        if (typeof v[key] === "number" && Number.isFinite(v[key]))
          d.settings[key] = Math.max(min, Math.min(max, v[key]));
      if (["easy", "normal", "hard", "master"].includes(v.difficulty))
        d.settings.difficulty = v.difficulty;
      for (const key of [
        "muted",
        "reduced",
        "vibration",
        "speechFallback",
        "compact",
        "leftHanded",
      ] as const)
        if (typeof v[key] === "boolean") d.settings[key] = v[key];
      if (v.keys && typeof v.keys === "object") {
        const merged = {
          ...defaultKeys,
          ...Object.fromEntries(
            Object.entries(v.keys).filter(
              ([key, value]) =>
                key in defaultKeys &&
                typeof value === "string" &&
                /^(Key[A-Z]|Digit[0-9]|Space|Shift(Left|Right))$/.test(value),
            ),
          ),
        };
        if (
          new Set(Object.values(merged)).size ===
          Object.keys(defaultKeys).length
        )
          d.settings.keys = merged;
      }
    }
    for (const key of ["highScore", "arcadeWins", "progress"] as const)
      if (Number.isSafeInteger(s[key]) && s[key] >= 0)
        d[key] =
          key === "progress"
            ? s.version < 3
              ? Math.min(s[key], 5) === 5
                ? 8
                : Math.min(s[key], 5)
              : Math.min(s[key], 9)
            : s[key];
    d.tutorial = s.tutorial === true;
    if (Array.isArray(s.unlocked))
      d.unlocked = [
        ...new Set([
          ...d.unlocked,
          ...s.unlocked.filter(
            (id: unknown) => typeof id === "string" && ids.includes(id),
          ),
        ]),
      ];
    if (Array.isArray(s.badges))
      d.badges = s.badges.filter((x: unknown) =>
        ["christmas-champion", "legacy-champion"].includes(String(x)),
      );
    if (
      s.version < 3 &&
      d.arcadeWins > 0 &&
      !d.badges.includes("legacy-champion")
    )
      d.badges.push("legacy-champion");
    if (Array.isArray(s.scores))
      d.scores = s.scores
        .filter(
          (x: Score) =>
            x &&
            ids.includes(x.fighter) &&
            ["arcade", "survival", "cpu", "versus"].includes(x.mode) &&
            Number.isSafeInteger(x.score) &&
            x.score >= 0 &&
            Number.isSafeInteger(x.bouts) &&
            x.bouts >= 0 &&
            ["champion", "defeat", "victory"].includes(x.result),
        )
        .sort((a: Score, b: Score) => b.score - a.score)
        .slice(0, 10);
    if (
      s.campaign &&
      ids.includes(s.campaign.fighter) &&
      Number.isInteger(s.campaign.index) &&
      s.campaign.index >= 0 &&
      s.campaign.index <= (s.version < 3 ? 5 : 9) &&
      Number.isSafeInteger(s.campaign.score) &&
      s.campaign.score >= 0 &&
      Number.isInteger(s.campaign.continues) &&
      s.campaign.continues >= 0 &&
      s.campaign.continues <= 3
    )
      d.campaign = {
        fighter: s.campaign.fighter,
        index: s.version < 3 && s.campaign.index === 5 ? 8 : s.campaign.index,
        score: s.campaign.score,
        continues: s.campaign.continues,
        completed: false,
        survival: false,
      };
    if (d.campaign) d.progress = d.campaign.index;
    return d;
  } catch {
    return d;
  }
}
export function persist(save: Save) {
  try {
    localStorage.setItem("caf-save", JSON.stringify(save));
  } catch {
    /* Private browsing can disable storage without disabling play. */
  }
}
export function recordScore(save: Save, score: Score) {
  save.highScore = Math.max(save.highScore, score.score);
  save.scores = [...save.scores, score]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  persist(save);
}

// Called only after a genuine Arcade match win. Training/CPU/Versus wins do not grant campaign unlocks.
export function awardCampaignVictory(
  save: Save,
  campaign: Campaign,
): string | null {
  const bout = route(campaign.fighter)[campaign.index];
  if (!bout?.unlock || bout.profile !== "boss") return null;
  const id = bout.unlock,
    fresh = !save.unlocked.includes(id);
  if (fresh) save.unlocked.push(id);
  if (id === "santa" && !save.badges.includes("christmas-champion"))
    save.badges.push("christmas-champion");
  return fresh ? id : null;
}
