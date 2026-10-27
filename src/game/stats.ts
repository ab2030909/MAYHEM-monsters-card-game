import { RARITY_META } from './elements';
import type { Element, Monster, Rarity, Species, Stats } from './types';
import { BOOST_PCT, FORM_STEP_PCT, MAX_MONSTER_LEVEL, monsterXpToNext } from './rules';

export { MAX_MONSTER_LEVEL };

export function uid(prefix = 'm'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Stats grow 6% of base per level. */
export function statsAtLevel(base: Stats, level: number): Stats {
  const f = 1 + 0.06 * (level - 1);
  return {
    hp: Math.round(base.hp * f),
    attack: Math.round(base.attack * f),
    defense: Math.round(base.defense * f),
    speed: Math.round(base.speed * f),
  };
}

export const NO_BOOSTS: Stats = { hp: 0, attack: 0, defense: 0, speed: 0 };

/**
 * The stats a monster really fights with:
 * level growth × (1 + 4% per boost rank) × (1 + 2% per form point).
 */
export function monsterStats(m: Pick<Monster, 'base' | 'level'> & Partial<Pick<Monster, 'boosts' | 'form'>>): Stats {
  const lv = statsAtLevel(m.base, m.level);
  const b = m.boosts ?? NO_BOOSTS;
  const form = 1 + ((m.form ?? 0) * FORM_STEP_PCT) / 100;
  const k = (key: keyof Stats) => Math.max(1, Math.round(lv[key] * (1 + (b[key] * BOOST_PCT) / 100) * form));
  return { hp: k('hp'), attack: k('attack'), defense: k('defense'), speed: k('speed') };
}

export function power(m: Pick<Monster, 'base' | 'level'> & Partial<Pick<Monster, 'boosts' | 'form'>>): number {
  const s = monsterStats(m);
  return Math.round(s.hp * 0.5 + s.attack * 1.2 + s.defense + s.speed * 0.8);
}

export { monsterXpToNext };

/** Fill defaults for fields added in later versions. */
export function normalizeMonster(m: Monster): Monster {
  return {
    ...m,
    form: m.form ?? 0,
    boosts: { ...NO_BOOSTS, ...(m.boosts ?? {}) },
    skills: m.skills ?? [],
    equippedSkill: m.equippedSkill ?? null,
    matches: m.matches ?? 0,
    lastGrade: m.lastGrade ?? null,
  };
}

export function speciesToMonster(s: Species, level = 1): Monster {
  return {
    uid: uid(),
    speciesId: s.id,
    name: s.name,
    element: s.element,
    rarity: s.rarity,
    level,
    xp: 0,
    base: { ...s.base },
    ability: { ...s.ability },
    lore: s.lore,
    image: s.image,
    custom: false,
    createdAt: Date.now(),
    wins: 0,
    form: 0,
    boosts: { ...NO_BOOSTS },
    skills: [],
    equippedSkill: null,
    matches: 0,
    lastGrade: null,
  };
}

/**
 * Add XP, levelling up while under the cap (Summoner level + 3, max 30).
 * At the cap, XP is held at "one point short" of the next level so nothing is lost
 * once the Summoner levels up.
 */
export function addMonsterXp(m: Monster, amount: number, cap: number): { monster: Monster; gained: number; capped: boolean } {
  let { level, xp } = m;
  xp += amount;
  let gained = 0;
  while (level < cap && xp >= monsterXpToNext(level)) {
    xp -= monsterXpToNext(level);
    level++;
    gained++;
  }
  const capped = level >= cap;
  if (level >= MAX_MONSTER_LEVEL) xp = 0;
  else if (capped) xp = Math.min(xp, monsterXpToNext(level) - 1);
  return { monster: { ...m, level, xp }, gained, capped };
}

// —— Creation studio rules ——

export type Archetype = 'balanced' | 'bruiser' | 'guardian' | 'swift';

export const ARCHETYPES: Record<Archetype, { label: string; blurb: string; weights: Stats }> = {
  balanced: { label: 'Balanced', blurb: 'Even stats, no weaknesses', weights: { hp: 1, attack: 1, defense: 1, speed: 1 } },
  bruiser: { label: 'Bruiser', blurb: 'Hits hard, slower to react', weights: { hp: 1, attack: 1.3, defense: 0.9, speed: 0.8 } },
  guardian: { label: 'Guardian', blurb: 'Tough and patient', weights: { hp: 1.2, attack: 0.85, defense: 1.3, speed: 0.65 } },
  swift: { label: 'Swift', blurb: 'Strikes first, fragile', weights: { hp: 0.9, attack: 1.05, defense: 0.75, speed: 1.3 } },
};

const ELEMENT_BIAS: Record<Element, Stats> = {
  fire: { hp: 1, attack: 1.08, defense: 0.95, speed: 1.02 },
  water: { hp: 1.06, attack: 0.98, defense: 1.02, speed: 0.98 },
  nature: { hp: 1.08, attack: 0.94, defense: 1.08, speed: 0.92 },
  electric: { hp: 0.94, attack: 1.04, defense: 0.94, speed: 1.12 },
  shadow: { hp: 0.96, attack: 1.1, defense: 0.92, speed: 1.06 },
  crystal: { hp: 1.02, attack: 1, defense: 1.1, speed: 0.92 },
};

/** Deterministic per-name variation so the same name always yields the same stats (±4%). */
function nameSeed(name: string): number[] {
  let h = 2166136261;
  for (const c of name.toLowerCase()) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return [0, 1, 2, 3].map((i) => (((h >>> (i * 8)) & 0xff) / 255) * 0.08 - 0.04);
}

export function generateStats(element: Element, rarity: Rarity, archetype: Archetype, name: string): Stats {
  const baseline: Stats = { hp: 112, attack: 58, defense: 54, speed: 58 };
  const w = ARCHETYPES[archetype].weights;
  const b = ELEMENT_BIAS[element];
  const r = RARITY_META[rarity].statMult;
  const v = nameSeed(name || 'monster');
  return {
    hp: Math.round(baseline.hp * w.hp * b.hp * r * (1 + v[0])),
    attack: Math.round(baseline.attack * w.attack * b.attack * r * (1 + v[1])),
    defense: Math.round(baseline.defense * w.defense * b.defense * r * (1 + v[2])),
    speed: Math.round(baseline.speed * w.speed * b.speed * r * (1 + v[3])),
  };
}

/** Rarity costs in the studio: pick directly, or roll for a chance at higher tiers. */
export const RARITY_COST: Record<Rarity, number> = { common: 0, rare: 150, epic: 400, legendary: 1000 };
export const ROLL_COST = 100;
export const ROLL_ODDS: Record<Rarity, number> = { common: 0.55, rare: 0.3, epic: 0.12, legendary: 0.03 };

export function rollRarity(): Rarity {
  const r = Math.random();
  let acc = 0;
  for (const k of ['legendary', 'epic', 'rare', 'common'] as Rarity[]) {
    acc += ROLL_ODDS[k];
    if (r < acc) return k;
  }
  return 'common';
}
