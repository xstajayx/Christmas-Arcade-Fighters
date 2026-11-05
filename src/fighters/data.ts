export type FighterId = "jamie" | "nash" | "bucket" | "beardy" | "frost";
export interface FighterDef {
  id: FighterId;
  name: string;
  title: string;
  color: number;
  coat: number;
  pants: number;
  skin: number;
  hair: number;
  speed: number;
  health: number;
  power: number;
  reach: number;
  special: string;
  bio: string;
  stats: [number, number, number];
}
export const fighters: FighterDef[] = [
  {
    id: "jamie",
    name: "JAMIE",
    title: "THE FESTIVE BRAWLER",
    color: 0xf05243,
    coat: 0x99342f,
    pants: 0x252c40,
    skin: 0xe9ad78,
    hair: 0x4b2d23,
    speed: 2.15,
    health: 104,
    power: 1.03,
    reach: 1,
    special: "Ember Bolt",
    bio: "Big heart. Bigger right hook. The village favourite brings the holiday heat.",
    stats: [4, 3, 4],
  },
  {
    id: "nash",
    name: "NASH",
    title: "THE REINDEER HEAVYWEIGHT",
    color: 0x67c9ed,
    coat: 0xb0b5cf,
    pants: 0x252836,
    skin: 0xe7b27e,
    hair: 0x302222,
    speed: 1.8,
    health: 118,
    power: 1.12,
    reach: 0.95,
    special: "Antler Charge",
    bio: "Built like a sleigh. Hits like a reindeer. Nobody gets past this brawler.",
    stats: [5, 2, 5],
  },
  {
    id: "bucket",
    name: "BUCKET",
    title: "THE BLIZZARD TRICKSTER",
    color: 0xb9e951,
    coat: 0x303342,
    pants: 0x242a37,
    skin: 0xf0bc87,
    hair: 0x302823,
    speed: 2.8,
    health: 96,
    power: 0.94,
    reach: 1.08,
    special: "Snowball Shuffle",
    bio: "A bucket hat, a belly full of mince pies, and absolutely no chill.",
    stats: [3, 5, 3],
  },
  {
    id: "beardy",
    name: "BEARDY",
    title: "THE EVERGREEN COUNTER",
    color: 0xf1bc58,
    coat: 0x466e43,
    pants: 0x55503c,
    skin: 0xe4a16e,
    hair: 0x663723,
    speed: 2.25,
    health: 102,
    power: 1,
    reach: 1.12,
    special: "Carol Counter",
    bio: "The beard is magnificent. The uppercut is a Christmas miracle.",
    stats: [4, 4, 3],
  },
];
export const frost: FighterDef = {
  ...fighters[0],
  id: "frost",
  name: "FROST JAMIE",
  title: "THE WINTER USURPER",
  color: 0x9be8ff,
  coat: 0x497ca0,
  hair: 0xe1f3fa,
  health: 128,
  speed: 2.05,
  power: 1.03,
  special: "Permafrost",
  bio: "The longest night has found its champion.",
  stats: [5, 4, 5],
};
export const fighterById = (id: FighterId) =>
  id === "frost" ? frost : fighters.find((f) => f.id === id)!;
export type MoveId =
  | "punch"
  | "kick"
  | "heavyPunch"
  | "heavyKick"
  | "low"
  | "air"
  | "grab"
  | "special"
  | "special2"
  | "special3"
  | "super";
export type MoveKind =
  | "strike"
  | "projectile"
  | "dash"
  | "throw"
  | "counter"
  | "wave"
  | "shield"
  | "teleport"
  | "aerial"
  | "super";
export interface Move {
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  range: number;
  stun: number;
  knockback: number;
  cost: number;
  level: "high" | "low" | "air" | "grab";
  kind?: MoveKind;
  launch?: number;
  dash?: number;
  invulnerable?: number;
  hits?: number;
  hitGap?: number;
  projectileSpeed?: number;
  cancel?: MoveId[];
  name?: string;
}
const specialCancels: MoveId[] = ["special", "special2", "special3", "super"];
export const moves: Record<MoveId, Move> = {
  punch: {
    startup: 6,
    active: 4,
    recovery: 13,
    damage: 7,
    range: 49,
    stun: 20,
    knockback: 5,
    cost: 0,
    level: "high",
    cancel: ["kick", "heavyPunch", "low", ...specialCancels],
  },
  kick: {
    startup: 10,
    active: 5,
    recovery: 18,
    damage: 11,
    range: 64,
    stun: 27,
    knockback: 9,
    cost: 0,
    level: "high",
    cancel: specialCancels,
  },
  heavyPunch: {
    startup: 13,
    active: 5,
    recovery: 24,
    damage: 16,
    range: 59,
    stun: 30,
    knockback: 15,
    cost: 0,
    level: "high",
    cancel: specialCancels,
  },
  heavyKick: {
    startup: 17,
    active: 6,
    recovery: 26,
    damage: 19,
    range: 75,
    stun: 32,
    knockback: 25,
    cost: 0,
    level: "high",
    launch: 3,
    cancel: ["super"],
  },
  low: {
    startup: 8,
    active: 5,
    recovery: 18,
    damage: 8,
    range: 55,
    stun: 23,
    knockback: 6,
    cost: 0,
    level: "low",
    cancel: specialCancels,
  },
  air: {
    startup: 7,
    active: 9,
    recovery: 15,
    damage: 10,
    range: 58,
    stun: 26,
    knockback: 8,
    cost: 0,
    level: "air",
    cancel: ["super"],
  },
  grab: {
    startup: 7,
    active: 3,
    recovery: 28,
    damage: 15,
    range: 39,
    stun: 35,
    knockback: 55,
    cost: 0,
    level: "grab",
    kind: "throw",
  },
  special: {
    startup: 14,
    active: 8,
    recovery: 24,
    damage: 20,
    range: 78,
    stun: 32,
    knockback: 25,
    cost: 40,
    level: "high",
  },
  special2: {
    startup: 10,
    active: 9,
    recovery: 22,
    damage: 18,
    range: 72,
    stun: 29,
    knockback: 22,
    cost: 30,
    level: "high",
  },
  special3: {
    startup: 18,
    active: 8,
    recovery: 26,
    damage: 22,
    range: 90,
    stun: 34,
    knockback: 30,
    cost: 35,
    level: "low",
  },
  super: {
    startup: 12,
    active: 28,
    recovery: 36,
    damage: 15,
    range: 135,
    stun: 30,
    knockback: 8,
    cost: 0,
    level: "high",
    kind: "super",
    hits: 3,
    hitGap: 10,
    invulnerable: 14,
    launch: 3,
  },
};
export const signatures: Record<FighterId, [string, string, string, string]> = {
  jamie: ["Ember Bolt", "Chimney Charge", "Holly Quake", "Santa Slam"],
  nash: [
    "Antler Charge",
    "Chimney Clinch",
    "Present Breaker",
    "Reindeer Rampage",
  ],
  bucket: [
    "Snowball Shuffle",
    "Sleigh Step",
    "Blizzard Spin",
    "Bucket Blizzard",
  ],
  beardy: [
    "Carol Counter",
    "Evergreen Guard",
    "Winter Reprisal",
    "Festive Fury",
  ],
  frost: ["Frozen Bolt", "Ice Spire", "Permafrost", "Absolute Zero"],
};
export function getMove(id: FighterId, move: MoveId): Move {
  const m = { ...moves[move] };
  if (move === "grab" && id === "nash") {
    m.damage = 21;
    m.range = 44;
    m.knockback = 68;
  }
  if (move === "punch" && id === "bucket") {
    m.startup = 4;
    m.recovery = 10;
    m.cancel = ["punch", "kick", ...specialCancels];
  }
  if (move === "super") {
    m.name = signatures[id][3];
    if (id === "jamie") {
      m.launch = 7;
      m.damage = 17;
    }
    if (id === "nash") {
      m.dash = 2.6;
      m.hits = 4;
      m.hitGap = 8;
      m.damage = 14;
    }
    if (id === "bucket") {
      m.hits = 5;
      m.hitGap = 6;
      m.damage = 10;
      m.range = 170;
    }
    if (id === "beardy") {
      m.invulnerable = 24;
      m.range = 150;
      m.damage = 16;
    }
    if (id === "frost") {
      m.hits = 4;
      m.hitGap = 8;
      m.range = 190;
      m.damage = 13;
    }
  }
  if (move.startsWith("special")) {
    const n = move === "special" ? 0 : move === "special2" ? 1 : 2;
    m.name = signatures[id][n];
    if (id === "jamie")
      Object.assign(
        m,
        n === 0
          ? { kind: "projectile", projectileSpeed: 5, damage: 16 }
          : n === 1
            ? { kind: "dash", dash: 5, range: 80, damage: 21 }
            : { kind: "wave", projectileSpeed: 3, level: "low", damage: 21 },
      );
    if (id === "nash")
      Object.assign(
        m,
        n === 0
          ? { kind: "dash", dash: 4, damage: 25, range: 83 }
          : n === 1
            ? {
                kind: "throw",
                level: "grab",
                range: 46,
                damage: 29,
                knockback: 70,
              }
            : { kind: "wave", projectileSpeed: 3, damage: 25, launch: 6 },
      );
    if (id === "bucket")
      Object.assign(
        m,
        n === 0
          ? { kind: "projectile", projectileSpeed: 8, startup: 8, damage: 12 }
          : n === 1
            ? { kind: "teleport", invulnerable: 15, damage: 10, range: 50 }
            : { kind: "strike", range: 110, startup: 9, damage: 18, launch: 4 },
      );
    if (id === "beardy")
      Object.assign(
        m,
        n === 0
          ? { kind: "counter", active: 25, damage: 24, range: 90 }
          : n === 1
            ? { kind: "shield", active: 5, damage: 0 }
            : {
                kind: "aerial",
                launch: 9,
                damage: 24,
                range: 70,
                invulnerable: 8,
              },
      );
    if (id === "frost")
      Object.assign(
        m,
        n === 0
          ? { kind: "projectile", projectileSpeed: 6, damage: 17 }
          : n === 1
            ? { kind: "wave", projectileSpeed: 4, damage: 19, launch: 7 }
            : { kind: "shield", damage: 0, active: 5 },
      );
  }
  return m;
}
