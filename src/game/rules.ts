/**
 * MAYHEM rulebook — every progression number lives here so the How to Play
 * page, the shop and the battle engine all read the same rules.
 */
import type { Ability, Element, Grade, ItemId, Monster, Stats } from './types';
import { ELEMENT_ABILITIES } from './monsters';

// ─────────────────────────── LEVELS ───────────────────────────

export const MAX_MONSTER_LEVEL = 30;
/** A monster can never be more than this many levels above its Summoner. */
export const LEVEL_CAP_OVER_SUMMONER = 3;
export const monsterLevelCap = (summonerLevel: number) => Math.min(MAX_MONSTER_LEVEL, summonerLevel + LEVEL_CAP_OVER_SUMMONER);
export const monsterXpToNext = (level: number) => 60 + level * 30;
export const summonerXpToNext = (level: number) => 120 + level * 60;
export const SUMMONER_LEVEL_COINS = 100;

// ─────────────────────────── FORM ───────────────────────────

export const FORM_MIN = -5;
export const FORM_MAX = 5;
export const FORM_STEP_PCT = 2; // each form point = ±2 % to all stats
export const clampForm = (f: number) => Math.max(FORM_MIN, Math.min(FORM_MAX, f));

// ─────────────────────────── BOOSTS ───────────────────────────

export const BOOST_PCT = 4; // each rank = +4 % of that stat
export const BOOST_MAX_RANK = 10;
export type StatKey = keyof Stats;
export const STAT_LABEL: Record<StatKey, string> = { hp: 'Health', attack: 'Attack', defense: 'Defense', speed: 'Speed' };
/** Ranks are limited by the monster's level: rank N needs monster level N. */
export const boostRankCap = (monsterLevel: number) => Math.min(BOOST_MAX_RANK, monsterLevel);
export const boostCost = (currentRank: number) => 60 + currentRank * 45;

// ─────────────────────────── SKILLS ───────────────────────────

export interface Skill extends Ability {
  id: string;
  element: Element | null; // null = any element can learn it
  level: number; // required monster level
  cost: number;
}

const GENERIC: Skill[] = [
  { id: 'focus_blast', element: null, level: 2, cost: 200, name: 'Focus Blast', description: 'A concentrated blast that ignores half of the defense.', power: 64, cooldown: 3, effect: 'pierce' },
  { id: 'second_wind', element: null, level: 3, cost: 260, name: 'Second Wind', description: 'A steady strike, then recovers 25% of its health.', power: 50, cooldown: 3, effect: 'heal' },
  { id: 'aegis_slam', element: null, level: 4, cost: 300, name: 'Aegis Slam', description: 'A shield bash, then a barrier that halves the next 2 hits.', power: 56, cooldown: 3, effect: 'shield' },
  { id: 'vampiric', element: null, level: 6, cost: 420, name: 'Vampiric Strike', description: 'Drains life — heals for half the damage dealt.', power: 66, cooldown: 3, effect: 'drain' },
  { id: 'daze', element: null, level: 8, cost: 520, name: 'Daze Wave', description: 'A ringing shockwave with a 40% chance to stun.', power: 64, cooldown: 3, effect: 'stun' },
];

const ULTIMATES: Record<Element, Omit<Skill, 'id' | 'element' | 'level' | 'cost'>> = {
  fire: { name: 'Supernova', description: 'An exploding star — massive damage and burns for 3 turns.', power: 96, cooldown: 4, effect: 'burn' },
  water: { name: 'Tsunami', description: 'A colossal wave that restores 25% of its health.', power: 92, cooldown: 4, effect: 'heal' },
  nature: { name: 'World Tree', description: 'Ancient roots drain life — heals for half the damage dealt.', power: 92, cooldown: 4, effect: 'drain' },
  electric: { name: 'Thunder God', description: 'Divine lightning with a 40% chance to stun.', power: 94, cooldown: 4, effect: 'stun' },
  shadow: { name: 'Eclipse', description: 'The sun goes out — ignores half of the defense.', power: 96, cooldown: 4, effect: 'pierce' },
  crystal: { name: 'Prism Storm', description: 'A storm of shards, then a crystal shield that halves the next 2 hits.', power: 90, cooldown: 4, effect: 'shield' },
};

export const SKILLS: Skill[] = [
  ...GENERIC,
  ...(Object.keys(ELEMENT_ABILITIES) as Element[]).flatMap((el) => [
    ...ELEMENT_ABILITIES[el].map((a, i) => ({ ...a, id: `${el}_${i}`, element: el, level: i === 0 ? 3 : 5, cost: i === 0 ? 240 : 360 })),
    { ...ULTIMATES[el], id: `${el}_ult`, element: el, level: 10, cost: 900 },
  ]),
];

export const getSkill = (id: string | null | undefined) => SKILLS.find((s) => s.id === id);
export const skillsFor = (m: Pick<Monster, 'element'>) => SKILLS.filter((s) => s.element === null || s.element === m.element).sort((a, b) => a.level - b.level);
/** The special ability a monster actually uses in battle. */
export const activeAbility = (m: Monster): Ability => getSkill(m.equippedSkill) ?? m.ability;

// ─────────────────────────── ITEMS ───────────────────────────

export interface Item {
  id: ItemId;
  name: string;
  description: string;
  cost: number;
  color: string;
}

export const ITEMS: Item[] = [
  { id: 'potion', name: 'Healing Draught', description: 'Restore 40% of the active monster’s health.', cost: 60, color: '#4ade80' },
  { id: 'elixir', name: 'Fury Elixir', description: '+30% Attack for 3 turns.', cost: 80, color: '#fb923c' },
  { id: 'tonic', name: 'Stoneskin Tonic', description: '+30% Defense for 3 turns.', cost: 80, color: '#38bdf8' },
  { id: 'feather', name: 'Swift Feather', description: '+30% Speed for 3 turns.', cost: 60, color: '#facc15' },
];
export const ITEMS_PER_BATTLE = 2;
export const BUFF_PCT = 30;
export const BUFF_TURNS = 3;
export const getItem = (id: ItemId) => ITEMS.find((i) => i.id === id)!;

// ─────────────────────────── PERFORMANCE ───────────────────────────

export interface Performance {
  uid: string;
  name: string;
  played: boolean;
  grade: Grade | null;
  score: number;
  damage: number;
  kos: number;
  survived: boolean;
}

export const GRADE_META: Record<Grade, { min: number; xpMult: number; form: number; color: string; label: string }> = {
  S: { min: 80, xpMult: 1.5, form: 2, color: '#fbbf24', label: 'Legendary' },
  A: { min: 60, xpMult: 1.25, form: 1, color: '#4ade80', label: 'Great' },
  B: { min: 40, xpMult: 1, form: 0, color: '#38bdf8', label: 'Solid' },
  C: { min: 20, xpMult: 0.75, form: -1, color: '#fb923c', label: 'Shaky' },
  D: { min: 0, xpMult: 0.5, form: -2, color: '#f87171', label: 'Poor' },
};
export const BENCH_XP_MULT = 0.3;

/**
 * Score 0–100 from: damage dealt vs the enemy team's total HP (up to 45),
 * knockouts (15 each, up to 30), staying alive (15) and HP left (up to 10).
 */
export function scorePerformance(p: { damage: number; kos: number; hp: number; maxHp: number }, enemyTotalHp: number): number {
  const dmg = Math.min(45, (p.damage / Math.max(1, enemyTotalHp)) * 45 * 2.2);
  const kos = Math.min(30, p.kos * 15);
  const alive = p.hp > 0 ? 15 : 0;
  const hpLeft = (Math.max(0, p.hp) / p.maxHp) * 10;
  return Math.round(dmg + kos + alive + hpLeft);
}

export function gradeFor(score: number): Grade {
  return (['S', 'A', 'B', 'C', 'D'] as Grade[]).find((g) => score >= GRADE_META[g].min) ?? 'D';
}
