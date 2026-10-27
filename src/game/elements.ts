import type { Element, Rarity } from './types';

export const ELEMENTS: Element[] = ['fire', 'water', 'nature', 'electric', 'shadow', 'crystal'];
export const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary'];

export const ELEMENT_META: Record<Element, { label: string; color: string; soft: string; glow: string }> = {
  fire: { label: 'Fire', color: '#ff7a3d', soft: 'rgba(255,122,61,0.16)', glow: 'rgba(255,122,61,0.55)' },
  water: { label: 'Water', color: '#38bdf8', soft: 'rgba(56,189,248,0.16)', glow: 'rgba(56,189,248,0.55)' },
  nature: { label: 'Nature', color: '#4ade80', soft: 'rgba(74,222,128,0.16)', glow: 'rgba(74,222,128,0.5)' },
  electric: { label: 'Electric', color: '#facc15', soft: 'rgba(250,204,21,0.16)', glow: 'rgba(250,204,21,0.5)' },
  shadow: { label: 'Shadow', color: '#a78bfa', soft: 'rgba(167,139,250,0.18)', glow: 'rgba(167,139,250,0.55)' },
  crystal: { label: 'Crystal', color: '#f0abfc', soft: 'rgba(240,171,252,0.16)', glow: 'rgba(240,171,252,0.5)' },
};

export const RARITY_META: Record<Rarity, { label: string; color: string; rank: number; statMult: number }> = {
  common: { label: 'Common', color: '#cbd5e1', rank: 0, statMult: 1 },
  rare: { label: 'Rare', color: '#38bdf8', rank: 1, statMult: 1.1 },
  epic: { label: 'Epic', color: '#c084fc', rank: 2, statMult: 1.2 },
  legendary: { label: 'Legendary', color: '#fbbf24', rank: 3, statMult: 1.33 },
};

/**
 * Type chart — two triangles plus one bridge:
 * Fire › Nature › Water › Fire, Shadow › Electric › Crystal › Shadow, and Electric › Water.
 */
export const STRONG_AGAINST: Record<Element, Element[]> = {
  fire: ['nature'],
  nature: ['water'],
  water: ['fire'],
  shadow: ['electric'],
  electric: ['crystal', 'water'],
  crystal: ['shadow'],
};

export function elementMultiplier(attacker: Element, defender: Element): number {
  if (STRONG_AGAINST[attacker].includes(defender)) return 1.5;
  if (STRONG_AGAINST[defender].includes(attacker)) return 0.67;
  return 1;
}

export function weakAgainst(el: Element): Element[] {
  return ELEMENTS.filter((e) => STRONG_AGAINST[e].includes(el));
}
