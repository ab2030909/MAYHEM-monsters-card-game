import type { Ability, Element, Species } from './types';

const img = (id: string) => ({ kind: 'bundled' as const, path: `/monsters/${id}.webp` });

/** The MAYHEM bestiary. The first 12 are the starter collection; the rest are unlockable. */
export const SPECIES: Species[] = [
  {
    id: 'emberclaw', name: 'Emberclaw', element: 'fire', rarity: 'epic',
    base: { hp: 128, attack: 78, defense: 52, speed: 70 },
    ability: { name: 'Molten Rend', description: 'Searing claws that leave the target burning for 3 turns.', power: 72, cooldown: 3, effect: 'burn' },
    lore: 'Born in the caldera of a sleeping volcano, its claws never cool.',
    image: img('emberclaw'),
  },
  {
    id: 'pyropup', name: 'Pyropup', element: 'fire', rarity: 'common',
    base: { hp: 104, attack: 58, defense: 44, speed: 66 },
    ability: { name: 'Tail Flare', description: 'A whip of flame that sets the target alight.', power: 58, cooldown: 2, effect: 'burn' },
    lore: 'A playful pup whose tail flickers brighter the happier it gets.',
    image: img('pyropup'),
  },
  {
    id: 'aquaphantom', name: 'Aquaphantom', element: 'water', rarity: 'legendary',
    base: { hp: 150, attack: 76, defense: 70, speed: 68 },
    ability: { name: 'Tidal Requiem', description: 'A spectral wave that crashes down and restores 25% of its health.', power: 80, cooldown: 3, effect: 'heal' },
    lore: 'Sailors speak of a glowing serpent that guides lost ships home — or swallows them.',
    image: img('aquaphantom'),
  },
  {
    id: 'bubblefin', name: 'Bubblefin', element: 'water', rarity: 'common',
    base: { hp: 118, attack: 50, defense: 56, speed: 52 },
    ability: { name: 'Bubble Ward', description: 'Splashes the foe and wraps itself in a shield that halves the next 2 hits.', power: 48, cooldown: 3, effect: 'shield' },
    lore: 'Its bubble helmet is said to hold a single breath from the ocean floor.',
    image: img('bubblefin'),
  },
  {
    id: 'mossling', name: 'Mossling', element: 'nature', rarity: 'common',
    base: { hp: 126, attack: 46, defense: 62, speed: 38 },
    ability: { name: 'Sapling Sip', description: 'Roots dig in, draining life — heals for half the damage dealt.', power: 56, cooldown: 2, effect: 'drain' },
    lore: 'Shy guardians of old forests. Where one rests, flowers bloom overnight.',
    image: img('mossling'),
  },
  {
    id: 'thornback', name: 'Thornback', element: 'nature', rarity: 'rare',
    base: { hp: 142, attack: 60, defense: 76, speed: 34 },
    ability: { name: 'Bramble Bastion', description: 'A thorny charge followed by a bark shield that halves the next 2 hits.', power: 62, cooldown: 3, effect: 'shield' },
    lore: 'Its shell is grown, not born — each ring of bark is a year of battle.',
    image: img('thornback'),
  },
  {
    id: 'voltbyte', name: 'Voltbyte', element: 'electric', rarity: 'rare',
    base: { hp: 106, attack: 70, defense: 46, speed: 84 },
    ability: { name: 'Overclock', description: 'A crackling strike with a 40% chance to stun the target for a turn.', power: 62, cooldown: 3, effect: 'stun' },
    lore: 'Feeds on stray current. Cities report blackouts wherever it naps.',
    image: img('voltbyte'),
  },
  {
    id: 'stormwing', name: 'Stormwing', element: 'electric', rarity: 'legendary',
    base: { hp: 136, attack: 84, defense: 58, speed: 82 },
    ability: { name: 'Skybreaker', description: 'A thunderbolt from above with a 40% chance to stun.', power: 84, cooldown: 3, effect: 'stun' },
    lore: 'When its wings unfold, storms gather across three kingdoms.',
    image: img('stormwing'),
  },
  {
    id: 'nightfang', name: 'Nightfang', element: 'shadow', rarity: 'epic',
    base: { hp: 120, attack: 80, defense: 50, speed: 76 },
    ability: { name: 'Umbral Bite', description: 'Fangs of shadow that slip past armor, ignoring half of the defense.', power: 70, cooldown: 3, effect: 'pierce' },
    lore: 'It hunts only under the new moon, when even its shadow disappears.',
    image: img('nightfang'),
  },
  {
    id: 'gloomwisp', name: 'Gloomwisp', element: 'shadow', rarity: 'common',
    base: { hp: 98, attack: 60, defense: 42, speed: 72 },
    ability: { name: 'Lantern Leech', description: 'Its lantern swallows light — heals for half the damage dealt.', power: 54, cooldown: 2, effect: 'drain' },
    lore: 'Lost travellers follow its lantern. Most of them come back. Most.',
    image: img('gloomwisp'),
  },
  {
    id: 'crystalis', name: 'Crystalis', element: 'crystal', rarity: 'legendary',
    base: { hp: 146, attack: 80, defense: 74, speed: 60 },
    ability: { name: 'Prism Nova', description: 'Refracted starlight that pierces through half of the defense.', power: 82, cooldown: 3, effect: 'pierce' },
    lore: 'The first dragon, said to have grown from a single shard of a fallen star.',
    image: img('crystalis'),
  },
  {
    id: 'shardling', name: 'Shardling', element: 'crystal', rarity: 'rare',
    base: { hp: 116, attack: 58, defense: 72, speed: 50 },
    ability: { name: 'Geode Guard', description: 'A quartz ram followed by a crystal shield that halves the next 2 hits.', power: 56, cooldown: 3, effect: 'shield' },
    lore: 'Miners keep one as a lucky charm — it can smell gemstones through solid rock.',
    image: img('shardling'),
  },
  // —— Unlockables ——
  {
    id: 'magmaw', name: 'Magmaw', element: 'fire', rarity: 'legendary',
    base: { hp: 160, attack: 86, defense: 68, speed: 46 },
    ability: { name: 'Caldera Roar', description: 'An eruption of magma that burns the target for 3 turns.', power: 86, cooldown: 3, effect: 'burn' },
    lore: 'A walking volcano. Its roar is the sound of new mountains being born.',
    image: img('magmaw'),
  },
  {
    id: 'venomire', name: 'Venomire', element: 'nature', rarity: 'epic',
    base: { hp: 122, attack: 74, defense: 54, speed: 72 },
    ability: { name: 'Orchid Venom', description: 'A toxic strike that drains life — heals for half the damage dealt.', power: 70, cooldown: 3, effect: 'drain' },
    lore: 'Beautiful, patient, and lethal. Its perfume is the last thing prey remembers.',
    image: img('venomire'),
  },
  {
    id: 'prismara', name: 'Prismara', element: 'crystal', rarity: 'epic',
    base: { hp: 114, attack: 72, defense: 58, speed: 80 },
    ability: { name: 'Rainbow Veil', description: 'Dazzling light with a 40% chance to stun the target.', power: 66, cooldown: 3, effect: 'stun' },
    lore: 'Its wings split moonlight into colors no one has a name for.',
    image: img('prismara'),
  },
  {
    id: 'abyssor', name: 'Abyssor', element: 'shadow', rarity: 'legendary',
    base: { hp: 158, attack: 88, defense: 64, speed: 58 },
    ability: { name: 'Void Maw', description: 'The void opens — devouring life and healing for half the damage.', power: 84, cooldown: 3, effect: 'drain' },
    lore: 'It does not live in the dark. The dark lives in it.',
    image: img('abyssor'),
  },
  {
    id: 'tidejaw', name: 'Tidejaw', element: 'water', rarity: 'rare',
    base: { hp: 118, attack: 68, defense: 54, speed: 66 },
    ability: { name: 'Riptide Maul', description: 'A crushing bite from the deep that ignores half of the defense.', power: 62, cooldown: 3, effect: 'pierce' },
    lore: 'It circles shipwrecks for centuries, guarding treasure no one remembers.',
    image: img('tidejaw'),
  },
  {
    id: 'lumoth', name: 'Lumoth', element: 'crystal', rarity: 'rare',
    base: { hp: 112, attack: 56, defense: 64, speed: 70 },
    ability: { name: 'Gemwing Glare', description: 'Blinding gem-light with a 40% chance to stun the target.', power: 56, cooldown: 3, effect: 'stun' },
    lore: 'Drawn to lanterns, it leaves trails of glittering dust on window sills.',
    image: img('lumoth'),
  },
  {
    id: 'zephyrix', name: 'Zephyrix', element: 'electric', rarity: 'epic',
    base: { hp: 116, attack: 76, defense: 52, speed: 88 },
    ability: { name: 'Thunderpounce', description: 'A lightning-fast pounce that ignores half of the defense.', power: 70, cooldown: 3, effect: 'pierce' },
    lore: 'Hunters only ever find the scorch marks where it was standing.',
    image: img('zephyrix'),
  },
  {
    id: 'phantomask', name: 'Phantomask', element: 'shadow', rarity: 'epic',
    base: { hp: 120, attack: 74, defense: 58, speed: 70 },
    ability: { name: 'Hollow Gaze', description: 'The mask stares into its soul — 40% chance to stun.', power: 68, cooldown: 3, effect: 'stun' },
    lore: 'No one has seen what lies beneath the mask. No one who wanted to, anyway.',
    image: img('phantomask'),
  },
  {
    id: 'coralisk', name: 'Coralisk', element: 'water', rarity: 'epic',
    base: { hp: 134, attack: 68, defense: 70, speed: 56 },
    ability: { name: 'Reef Renewal', description: 'A tidal crash that restores 25% of its health.', power: 66, cooldown: 3, effect: 'heal' },
    lore: 'The royal serpent of the sunken reef. Its crown grows a new branch every century.',
    image: img('coralisk'),
  },
  {
    id: 'elderwood', name: 'Elderwood', element: 'nature', rarity: 'legendary',
    base: { hp: 168, attack: 78, defense: 82, speed: 48 },
    ability: { name: 'Ancient Bloom', description: 'The forest answers — a crushing strike followed by a bark shield that halves the next 2 hits.', power: 80, cooldown: 3, effect: 'shield' },
    lore: 'The oldest living thing in the realm. Kingdoms rise and fall in a single breath of its.',
    image: img('elderwood'),
  },
];

export const STARTER_IDS = SPECIES.slice(0, 12).map((s) => s.id);

/** Every locked monster needs BOTH a summoner level and a coin payment to unlock. */
export interface UnlockRule {
  speciesId: string;
  level: number;
  coins: number;
}

export const UNLOCKS: UnlockRule[] = [
  { speciesId: 'tidejaw', level: 2, coins: 250 },
  { speciesId: 'lumoth', level: 3, coins: 300 },
  { speciesId: 'venomire', level: 4, coins: 450 },
  { speciesId: 'zephyrix', level: 5, coins: 600 },
  { speciesId: 'prismara', level: 6, coins: 700 },
  { speciesId: 'phantomask', level: 7, coins: 800 },
  { speciesId: 'coralisk', level: 8, coins: 900 },
  { speciesId: 'magmaw', level: 10, coins: 1500 },
  { speciesId: 'elderwood', level: 12, coins: 1800 },
  { speciesId: 'abyssor', level: 15, coins: 2500 },
];

export const unlockRuleFor = (id: string) => UNLOCKS.find((u) => u.speciesId === id);

export type UnlockStatus = 'owned' | 'ready' | 'need-level' | 'need-coins';
export function unlockStatus(rule: UnlockRule, level: number, coins: number, owned: boolean): UnlockStatus {
  if (owned) return 'owned';
  if (level < rule.level) return 'need-level';
  if (coins < rule.coins) return 'need-coins';
  return 'ready';
}

export const getSpecies = (id: string) => SPECIES.find((s) => s.id === id);

/** Two ability options per element for the creation studio. */
export const ELEMENT_ABILITIES: Record<Element, Ability[]> = {
  fire: [
    { name: 'Inferno Burst', description: 'An explosive blast that burns the target for 3 turns.', power: 62, cooldown: 3, effect: 'burn' },
    { name: 'Blazing Fang', description: 'A white-hot bite that ignores half of the defense.', power: 64, cooldown: 3, effect: 'pierce' },
  ],
  water: [
    { name: 'Healing Tide', description: 'A crashing wave that restores 25% of its health.', power: 60, cooldown: 3, effect: 'heal' },
    { name: 'Riptide Shell', description: 'A splash attack, then a shield that halves the next 2 hits.', power: 52, cooldown: 3, effect: 'shield' },
  ],
  nature: [
    { name: 'Thorn Drain', description: 'Leeching vines — heals for half the damage dealt.', power: 60, cooldown: 3, effect: 'drain' },
    { name: 'Barkskin Slam', description: 'A heavy slam, then a shield that halves the next 2 hits.', power: 54, cooldown: 3, effect: 'shield' },
  ],
  electric: [
    { name: 'Static Shock', description: 'A jolt with a 40% chance to stun the target.', power: 62, cooldown: 3, effect: 'stun' },
    { name: 'Railgun', description: 'A focused bolt that ignores half of the defense.', power: 66, cooldown: 3, effect: 'pierce' },
  ],
  shadow: [
    { name: 'Soul Siphon', description: 'Steals essence — heals for half the damage dealt.', power: 60, cooldown: 3, effect: 'drain' },
    { name: 'Night Terror', description: 'A nightmare strike with a 40% chance to stun.', power: 60, cooldown: 3, effect: 'stun' },
  ],
  crystal: [
    { name: 'Shard Lance', description: 'A crystal spear that ignores half of the defense.', power: 64, cooldown: 3, effect: 'pierce' },
    { name: 'Diamond Aegis', description: 'A crystal strike, then a shield that halves the next 2 hits.', power: 52, cooldown: 3, effect: 'shield' },
  ],
};
