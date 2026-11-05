import type { FighterId } from "../fighters/data";
import type { Difficulty } from "../ai/cpu";
export interface Bout {
  stage: number;
  opponent: FighterId;
  difficulty: Difficulty;
  line: string;
  boss: boolean;
}
export interface Campaign {
  fighter: FighterId;
  index: number;
  score: number;
  continues: number;
  completed: boolean;
  survival: boolean;
}
export function route(fighter: FighterId): Bout[] {
  const rivals = (["jamie", "nash", "bucket", "beardy"] as FighterId[]).filter(
    (id) => id !== fighter,
  );
  return [
    {
      stage: 0,
      opponent: rivals[0],
      difficulty: "easy",
      line: "One friendly fight before the village feast.",
      boss: false,
    },
    {
      stage: 1,
      opponent: rivals[1],
      difficulty: "normal",
      line: "The pier has a new challenger.",
      boss: false,
    },
    {
      stage: 2,
      opponent: rivals[2],
      difficulty: "normal",
      line: "The workshop is working overtime.",
      boss: false,
    },
    {
      stage: 3,
      opponent: "beardy",
      difficulty: "hard",
      line: "Patience wins in the frozen forest.",
      boss: false,
    },
    {
      stage: 4,
      opponent: rivals[0],
      difficulty: "hard",
      line: "The rooftops are no place for cold feet.",
      boss: false,
    },
    {
      stage: 5,
      opponent: "frost",
      difficulty: "master",
      line:
        fighter === "jamie"
          ? "I am the winter you left behind, Jamie."
          : "Your Christmas ends with me.",
      boss: true,
    },
  ];
}
export const newCampaign = (
  fighter: FighterId,
  index = 0,
  survival = false,
): Campaign => ({
  fighter,
  index: Math.max(0, Math.min(5, index)),
  score: 0,
  continues: 3,
  completed: false,
  survival,
});
export function bonuses(
  health: number,
  maxHealth: number,
  ticks: number,
  combo: number,
) {
  return {
    health: Math.round((health / maxHealth) * 1000),
    time: Math.ceil(ticks / 60) * 20,
    combo: Math.max(0, combo) * 100,
  };
}
export function advance(c: Campaign, won: boolean, points: number) {
  if (c.completed) return false;
  if (!won) return false;
  c.score += points;
  c.index++;
  if (!c.survival && c.index >= 6) {
    c.completed = true;
    c.index = 5;
  }
  return true;
}
export function continueCampaign(c: Campaign) {
  if (c.continues <= 0) return false;
  c.continues--;
  return true;
}
export function survivalBout(c: Campaign): Bout {
  const ids: FighterId[] = ["jamie", "nash", "bucket", "beardy"];
  return {
    stage: c.index % 6,
    opponent: c.index > 0 && c.index % 6 === 5 ? "frost" : ids[c.index % 4],
    difficulty:
      c.index < 2
        ? "easy"
        : c.index < 5
          ? "normal"
          : c.index < 9
            ? "hard"
            : "master",
    line: `Wave ${c.index + 1}. Keep the Christmas spirit alive.`,
    boss: c.index % 6 === 5,
  };
}

export function campaignDifficulty(
  base: Difficulty,
  setting: Difficulty,
): Difficulty {
  const levels: Difficulty[] = ["easy", "normal", "hard", "master"];
  const offset = { easy: -1, normal: 0, hard: 1, master: 2 }[setting];
  return levels[Math.max(0, Math.min(3, levels.indexOf(base) + offset))];
}
