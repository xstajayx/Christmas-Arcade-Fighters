import { strikeContact } from "../combat/contact";
import { balance, normalDamage } from "../combat/balance";
export type FighterId =
  "jamie" | "nash" | "bucket" | "beardy" | "frost" | "rob" | "santa";
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
export type BalanceProfile = "standard" | "boss";
export const rob: FighterDef = {
  ...fighters[1],
  id: "rob",
  name: "THE ROB FATHER",
  title: "THE FESTIVE KINGPIN",
  color: 0xc67d52,
  coat: 0x642c44,
  health: 110,
  speed: 1.75,
  power: 1.03,
  reach: 1.04,
  special: "Present Punisher",
  bio: "The collection is due. This Christmas, he means business.",
  stats: [5, 2, 4],
};
export const santa: FighterDef = {
  ...fighters[0],
  id: "santa",
  name: "SANTA",
  title: "THE NORTH POLE CHAMPION",
  color: 0xe85e55,
  health: 108,
  speed: 1.95,
  power: 1.01,
  reach: 1.02,
  special: "Gift Storm",
  bio: "The final delivery is a lesson in Christmas spirit.",
  stats: [4, 3, 4],
};
export const roster = [...fighters, rob, santa];
export const fighterById = (
  id: FighterId,
  profile: BalanceProfile = "standard",
): FighterDef => {
  const base = id === "frost" ? frost : roster.find((f) => f.id === id)!;
  if (profile === "boss" && id === "frost")
    return { ...base, health: 1500, power: 1 };
  if (profile === "boss" && id === "rob")
    return { ...base, health: 1750, power: 1.06 };
  if (profile === "boss" && id === "santa")
    return { ...base, health: 1900, power: 1.03 };
  return {
    ...base,
    health: Math.round(base.health * balance.healthScale),
    special: primarySpecials[id][0],
  };
};
export type MoveId =
  | "punch"
  | "kick"
  | "heavyPunch"
  | "heavyKick"
  | "low"
  | "air"
  | "airPunch"
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
  level: "high" | "mid" | "low" | "air" | "grab";
  kind?: MoveKind;
  launch?: number;
  dash?: number;
  invulnerable?: number;
  hits?: number;
  hitGap?: number;
  projectileSpeed?: number;
  cancel?: MoveId[];
  name?: string;
  armour?: [number, number];
  poseRow?: number;
  bursts?: number;
  burstGap?: number;
  jumpCancel?: boolean;
  launchX?: number;
  blockstun?: number;
  hitstop?: number;
  hitboxY?: number;
  hitboxHeight?: number;
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
    level: "mid",
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
    level: "mid",
    cancel: ["heavyPunch", "heavyKick", ...specialCancels],
  },
  heavyPunch: {
    name: "Rising Uppercut",
    launch: 9.2,
    launchX: 2.2,
    jumpCancel: true,
    hitboxY: 185,
    hitboxHeight: 125,
    hitstop: 9,
    blockstun: 15,
    startup: 13,
    active: 5,
    recovery: 24,
    damage: 16,
    range: 59,
    stun: 30,
    knockback: 15,
    cost: 0,
    level: "mid",
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
    level: "mid",
    launch: 7.2,
    launchX: 3,
    jumpCancel: true,
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
  airPunch: {
    name: "Jump Punch",
    startup: 5,
    active: 6,
    recovery: 10,
    damage: 8,
    range: 55,
    stun: 18,
    knockback: 6,
    cost: 0,
    level: "air",
    hitboxY: 130,
    hitboxHeight: 75,
    blockstun: 10,
    hitstop: 4,
    cancel: ["air", "super"],
  },
  grab: {
    startup: 7,
    active: 3,
    recovery: 28,
    damage: 15,
    range: 49,
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
    level: "mid",
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
    level: "mid",
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
    level: "mid",
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
  rob: [
    "Present Punisher",
    "Sleigh Charge",
    "Festive Collection",
    "The Rob Father Special",
  ],
  santa: [
    "Gift Storm",
    "Reindeer Rush",
    "North Pole Freeze",
    "Santa’s Final Delivery",
  ],
};
export function getMove(
  id: FighterId,
  move: MoveId,
  profile: BalanceProfile = "standard",
  phase = 0,
): Move {
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
    m.knockback = 40;
    if (profile === "boss") m.recovery = 52;
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
  if (id === "rob") {
    if (move === "special")
      Object.assign(m, {
        kind: "strike",
        range: 76,
        startup: 13,
        active: 20,
        hits: 3,
        hitGap: 7,
        damage: 9,
      });
    if (move === "special2")
      Object.assign(m, {
        kind: "dash",
        dash: 4,
        range: 82,
        startup: 18,
        damage: 23,
        recovery: 28,
        ...(profile === "boss" ? { armour: [4, 10] } : {}),
      });
    if (move === "special3")
      Object.assign(m, {
        kind: "throw",
        level: "grab",
        range: 44,
        startup: 12,
        damage: 24,
        cost: 35,
        recovery: 30,
      });
    if (move === "super")
      Object.assign(m, {
        dash: 2,
        range: 115,
        hits: 4,
        hitGap: 8,
        active: 30,
        damage: 12,
        knockback: 55,
      });
  }
  if (id === "santa") {
    if (move === "heavyPunch")
      Object.assign(m, {
        name: "Candy Cane Crusher",
        range: 78,
        damage: 18,
        startup: 15,
        recovery: 28,
      });
    if (move === "special")
      Object.assign(m, {
        kind: "projectile",
        range: 65,
        damage: 10,
        startup: 18,
        active: 25,
        recovery: 30,
        bursts: profile === "boss" ? phase + 1 : 2,
        burstGap: 10,
        projectileSpeed: 4,
      });
    if (move === "special2")
      Object.assign(m, {
        kind: "dash",
        dash: 5,
        range: 78,
        startup: 17,
        damage: 20,
        recovery: 29,
      });
    if (move === "special3")
      Object.assign(m, {
        kind: "wave",
        level: "low",
        projectileSpeed: 2.5,
        range: 70,
        damage: 18,
        startup: 22,
        recovery: 32,
      });
    if (move === "super")
      Object.assign(m, {
        range: 165,
        hits: 4,
        hitGap: 8,
        active: 30,
        damage: 12,
        launch: 5,
        knockback: 45,
      });
  }
  if (move === "heavyKick" || move === "air") m.level = "high";
  m.damage = Math.round(m.damage * balance.damageScale);
  if (move in normalDamage)
    m.damage = normalDamage[move as keyof typeof normalDamage];
  if (move === "grab" && id === "nash") m.damage = 100;
  if (profile === "standard" && (move === "special" || move === "special2")) {
    const dash = move === "special";
    const dashRows = {
      jamie: 1,
      nash: 0,
      bucket: 1,
      beardy: 2,
      frost: 1,
      rob: 1,
      santa: 1,
    };
    const projectileRows = {
      jamie: 0,
      nash: 2,
      bucket: 0,
      beardy: 1,
      frost: 0,
      rob: 0,
      santa: 0,
    };
    Object.assign(m, {
      kind: dash ? "dash" : "projectile",
      level: "mid",
      name: primarySpecials[id][dash ? 0 : 1],
      startup: dash ? (id === "bucket" ? 10 : 14) : 18,
      active: dash ? 12 : 5,
      recovery: dash ? 26 : 29,
      damage: dash
        ? id === "nash" || id === "rob"
          ? 105
          : 88
        : id === "bucket"
          ? 65
          : 78,
      range: dash ? 72 : 60,
      cost: dash ? 40 : 35,
      dash: dash ? (id === "bucket" ? 5 : 4) : 0,
      projectileSpeed: id === "bucket" ? 7 : 5,
      hits: 1,
      hitGap: undefined,
      bursts: undefined,
      armour: undefined,
      invulnerable: undefined,
      launch: undefined,
      poseRow: dash ? dashRows[id] : projectileRows[id],
    });
  }
  if (profile === "standard" && move === "special")
    m.range = (96 - 13) / fighterById(id).reach;
  if (m.kind === "throw") m.range = (97 - 13) / fighterById(id, profile).reach;
  const contact = strikeContact(id, move);
  if (contact)
    m.range = (contact.reach + 2 - 13) / fighterById(id, profile).reach;
  if (move === "super")
    m.damage = Math.round(
      (balance.superReferenceHealth * balance.superFraction) /
        ((m.hits || 1) * fighterById(id, profile).power),
    );
  return m;
}

export const endings: Record<FighterId, string> = {
  jamie:
    "Jamie faced the winter within himself, earned Santa’s respect, and brought warmth back to the village.",
  nash: "Nash carried the last fallen present home. Even a heavyweight can have a gentle heart.",
  bucket:
    "Bucket tipped his neon hat. The final blizzard became a glittering Christmas snowfall.",
  beardy:
    "Beardy lowered his guard. For the first time that night, the forest was quiet.",
  rob: "The Rob Father forgave every winter debt. Tonight, the collection was a feast for the whole village.",
  santa:
    "Santa handed the champion’s bell to the village. The finest delivery was Christmas spirit itself.",
  frost: "Even the longest night gives way to a Christmas dawn.",
};

export const primarySpecials: Record<FighterId, [string, string]> = {
  jamie: ["Chimney Charge", "Ember Bolt"],
  nash: ["Antler Charge", "Present Shot"],
  bucket: ["Sleigh Dash", "Snowball Shuffle"],
  beardy: ["Evergreen Rush", "Holly Bolt"],
  frost: ["Ice Rush", "Frozen Bolt"],
  rob: ["Sleigh Charge", "Collection Gift"],
  santa: ["Reindeer Rush", "Gift Storm"],
};
