export type FighterId = "jamie" | "nash" | "bucket" | "beardy";
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
    special: "Holly Haymaker",
    bio: "Big heart. Bigger right hook. The village favourite brings the holiday heat.",
    stats: [4, 3, 4],
  },
  {
    id: "nash",
    name: "NASH",
    title: "THE PIER SPEEDSTER",
    color: 0x67c9ed,
    coat: 0xb0b5cf,
    pants: 0x252836,
    skin: 0xe7b27e,
    hair: 0x302222,
    speed: 2.7,
    health: 94,
    power: 0.92,
    reach: 0.95,
    special: "Polar Rush",
    bio: "Quick on his feet and never on the naughty list. Catch him if you can.",
    stats: [3, 5, 3],
  },
  {
    id: "bucket",
    name: "BUCKET",
    title: "THE JINGLE JUGGERNAUT",
    color: 0xb9e951,
    coat: 0x303342,
    pants: 0x242a37,
    skin: 0xf0bc87,
    hair: 0x302823,
    speed: 1.75,
    health: 118,
    power: 1.13,
    reach: 1.08,
    special: "Snowball Slam",
    bio: "A bucket hat, a belly full of mince pies, and absolutely no chill.",
    stats: [5, 2, 5],
  },
  {
    id: "beardy",
    name: "BEARDY",
    title: "THE WINTER WILDCARD",
    color: 0xf1bc58,
    coat: 0x466e43,
    pants: 0x55503c,
    skin: 0xe4a16e,
    hair: 0x663723,
    speed: 2.25,
    health: 102,
    power: 1,
    reach: 1.12,
    special: "Yuletide Uppercut",
    bio: "The beard is magnificent. The uppercut is a Christmas miracle.",
    stats: [4, 4, 3],
  },
];
export const fighterById = (id: FighterId) =>
  fighters.find((f) => f.id === id)!;
export type MoveId = "punch" | "kick" | "low" | "air" | "grab" | "special";
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
  launch?: number;
  dash?: number;
}
export const moves: Record<MoveId, Move> = {
  punch: {
    startup: 6,
    active: 4,
    recovery: 13,
    damage: 7,
    range: 49,
    stun: 17,
    knockback: 9,
    cost: 0,
    level: "high",
  },
  kick: {
    startup: 11,
    active: 5,
    recovery: 20,
    damage: 12,
    range: 64,
    stun: 23,
    knockback: 17,
    cost: 0,
    level: "high",
  },
  low: {
    startup: 8,
    active: 5,
    recovery: 18,
    damage: 8,
    range: 55,
    stun: 19,
    knockback: 12,
    cost: 0,
    level: "low",
  },
  air: {
    startup: 7,
    active: 9,
    recovery: 15,
    damage: 10,
    range: 58,
    stun: 23,
    knockback: 14,
    cost: 0,
    level: "air",
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
  },
  special: {
    startup: 14,
    active: 10,
    recovery: 29,
    damage: 22,
    range: 78,
    stun: 34,
    knockback: 36,
    cost: 40,
    level: "high",
    launch: 5,
  },
};
export function getMove(id: FighterId, move: MoveId): Move {
  const m = { ...moves[move] };
  if (move === "special") {
    if (id === "jamie") {
      m.damage = 25;
      m.range = 87;
    }
    if (id === "nash") {
      m.startup = 10;
      m.damage = 19;
      m.dash = 4;
      m.range = 65;
    }
    if (id === "bucket") {
      m.damage = 29;
      m.startup = 20;
      m.level = "low";
      m.knockback = 48;
      m.launch = 7;
    }
    if (id === "beardy") {
      m.startup = 9;
      m.range = 67;
      m.launch = 10;
    }
  }
  return m;
}
