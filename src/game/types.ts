export type Element = 'fire' | 'water' | 'nature' | 'electric' | 'shadow' | 'crystal';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Stats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
}

export type AbilityEffect = 'burn' | 'heal' | 'shield' | 'stun' | 'drain' | 'pierce';

export interface Ability {
  name: string;
  description: string;
  /** Base power of the ability (basic attack is 40). */
  power: number;
  /** Turns before it can be used again. */
  cooldown: number;
  effect: AbilityEffect;
}

/** Where a monster's artwork lives. */
export type MonsterImage =
  | { kind: 'bundled'; path: string }
  | { kind: 'cloudinary'; publicId: string; removeBg?: boolean; version?: number }
  | { kind: 'local'; dataUrl: string };

/** A monster definition in the MAYHEM bestiary. */
export interface Species {
  id: string;
  name: string;
  element: Element;
  rarity: Rarity;
  base: Stats;
  ability: Ability;
  lore: string;
  image: MonsterImage;
}

/** A monster owned by the player (bestiary copy or custom creation). */
export interface Monster {
  uid: string;
  speciesId: string | null;
  name: string;
  element: Element;
  rarity: Rarity;
  level: number;
  xp: number;
  base: Stats;
  ability: Ability;
  lore: string;
  image: MonsterImage;
  custom: boolean;
  createdAt: number;
  wins: number;
  favorite?: boolean;
  /** Match form, −5…+5. Each point = ±2% to all stats. Moves with match performance. */
  form: number;
  /** Purchased permanent boost ranks per stat (each rank +4% of that stat). */
  boosts: Stats;
  /** Learned skill ids from the skill catalogue. */
  skills: string[];
  /** Equipped special: a learned skill id, or null for the innate ability. */
  equippedSkill: string | null;
  matches: number;
  lastGrade?: Grade | null;
}

export type Grade = 'S' | 'A' | 'B' | 'C' | 'D';

export type ItemId = 'potion' | 'elixir' | 'tonic' | 'feather';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  reward: number;
}

export interface DailyQuest {
  id: string;
  title: string;
  target: number;
  reward: { coins: number; xp: number };
  metric: QuestMetric;
}

export type QuestMetric = 'wins' | 'specials' | 'creates' | 'battles' | 'upgrades';

export interface PlayerState {
  version: number;
  inventory: Record<ItemId, number>;
  name: string;
  level: number;
  xp: number;
  coins: number;
  monsters: Monster[];
  team: string[];
  unlockedSpecies: string[];
  achievements: string[];
  claimedMilestones: number[];
  stats: {
    battles: number;
    wins: number;
    losses: number;
    winStreak: number;
    bestStreak: number;
    created: number;
    specialsUsed: number;
    championWins: number;
  };
  daily: {
    lastClaimDate: string | null;
    streak: number;
    questDate: string;
    questProgress: Record<string, number>;
    questClaimed: string[];
  };
  uploads: { publicId: string; createdAt: number }[];
  discovered: string[];
}
