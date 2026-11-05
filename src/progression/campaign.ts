import type { FighterId, BalanceProfile } from "../fighters/data";
import type { Difficulty, CPUStyle } from "../ai/cpu";
export const CAMPAIGN_LENGTH = 10;
export interface Bout {
  stage: number;
  opponent: FighterId;
  difficulty: Difficulty;
  line: string;
  boss: boolean;
  profile: BalanceProfile;
  style: CPUStyle;
  challenge: string;
  unlock?: FighterId;
  rewardContinues?: number;
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
  const regular: [number, FighterId, Difficulty, CPUStyle, string][] = [
    [0, rivals[0], "easy", "balanced", "Village welcome"],
    [1, "bucket", "normal", "rush", "Speed and spacing"],
    [2, "jamie", "normal", "projectile", "Projectile pressure"],
    [3, "beardy", "normal", "defensive", "Guard and punish"],
    [4, "nash", "hard", "throw", "Break the clinch"],
    [0, rivals[1], "hard", "combo", "Confirm and cancel"],
    [5, rivals[2], "hard", "aggressive", "The winter gauntlet"],
  ];
  return [
    ...regular.map(([stage, opponent, difficulty, style, challenge]) => ({
      stage,
      opponent,
      difficulty,
      style,
      challenge,
      line: challenge + ". Bring the Christmas spirit.",
      boss: false,
      profile: "standard" as const,
    })),
    {
      stage: 6,
      opponent: "rob",
      difficulty: "hard",
      style: "rob",
      challenge: "Major boss — The Rob Father",
      line: "The collection is due. Let us settle this like gentlemen.",
      boss: true,
      profile: "boss",
      unlock: "rob",
      rewardContinues: 3,
    },
    {
      stage: 5,
      opponent: "frost",
      difficulty: "master",
      style: "frost",
      challenge: "Frost Challenge",
      line:
        fighter === "jamie"
          ? "I am the winter you left behind, Jamie."
          : "The throne waits beyond the frost.",
      boss: true,
      profile: "boss",
    },
    {
      stage: 7,
      opponent: "santa",
      difficulty: "master",
      style: "santa",
      challenge: "Final battle — Santa",
      line: "One last delivery. Show me your Christmas spirit!",
      boss: true,
      profile: "boss",
      unlock: "santa",
    },
  ];
}
export const newCampaign = (
  fighter: FighterId,
  index = 0,
  survival = false,
): Campaign => ({
  fighter,
  index: Math.max(0, Math.min(9, index)),
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
  if (c.completed || !won) return false;
  const reward = c.survival
    ? 0
    : route(c.fighter)[c.index]?.rewardContinues || 0;
  c.continues = Math.min(3, c.continues + reward);
  c.score += points;
  c.index++;
  if (!c.survival && c.index >= CAMPAIGN_LENGTH) {
    c.completed = true;
    c.index = 9;
  }
  return true;
}
export function continueCampaign(c: Campaign) {
  if (c.continues <= 0) return false;
  c.continues--;
  return true;
}
export function survivalBout(c: Campaign): Bout {
  const path = route(c.fighter),
    bout = path[c.index % 10];
  return {
    ...bout,
    unlock: undefined,
    difficulty:
      c.index < 2
        ? "easy"
        : c.index < 5
          ? "normal"
          : c.index < 9
            ? "hard"
            : "master",
    line: `Wave ${c.index + 1}. Keep the Christmas spirit alive.`,
  };
}
export function campaignDifficulty(
  base: Difficulty,
  setting: Difficulty,
): Difficulty {
  const levels: Difficulty[] = ["easy", "normal", "hard", "master"];
  return levels[
    Math.max(
      0,
      Math.min(
        3,
        levels.indexOf(base) +
          { easy: -1, normal: 0, hard: 1, master: 2 }[setting],
      ),
    )
  ];
}
