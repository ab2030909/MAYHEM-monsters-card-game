import { elementMultiplier } from './elements';
import { SPECIES } from './monsters';
import { monsterStats, speciesToMonster } from './stats';
import { activeAbility, BENCH_XP_MULT, BUFF_PCT, BUFF_TURNS, getItem, GRADE_META, gradeFor, ITEMS_PER_BATTLE, scorePerformance, type Performance } from './rules';
import type { Ability, Element, ItemId, Monster, MonsterImage, Rarity } from './types';

export type Side = 'player' | 'enemy';
export type Difficulty = 'rookie' | 'veteran' | 'champion';

export const DIFFICULTY: Record<Difficulty, { label: string; offset: number; coinMult: number; xpMult: number; blurb: string }> = {
  rookie: { label: 'Rookie', offset: -1, coinMult: 1, xpMult: 1, blurb: 'Relaxed rivals, perfect for warming up.' },
  veteran: { label: 'Veteran', offset: 1, coinMult: 1.6, xpMult: 1.4, blurb: 'Smart switching and well-timed abilities.' },
  champion: { label: 'Champion', offset: 3, coinMult: 2.5, xpMult: 2, blurb: 'Elite teams with a legendary ace.' },
};

export const BASIC_POWER = 40;

export interface Fighter {
  uid: string;
  name: string;
  element: Element;
  rarity: Rarity;
  level: number;
  image: MonsterImage;
  maxHp: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  ability: Ability;
  cooldown: number;
  defending: boolean;
  shield: number;
  burn: number;
  stunned: boolean;
  /** Remaining turns of item buffs. */
  buffs: { atk: number; def: number; spd: number };
  /** Performance tracking. */
  dmgDealt: number;
  kos: number;
  played: boolean;
  form: number;
}

export interface LogEntry {
  id: number;
  side: Side | 'system';
  text: string;
  tone?: 'good' | 'bad' | 'neutral' | 'super' | 'weak';
}

export interface BattleState {
  player: Fighter[];
  enemy: Fighter[];
  active: Record<Side, number>;
  round: number;
  log: LogEntry[];
  outcome: null | 'won' | 'lost';
  needsSwitch: boolean;
  difficulty: Difficulty;
  rival: string;
  specialsUsed: number;
  /** Items available when the battle started, and the ones used so far. */
  inventory: Record<ItemId, number>;
  itemsUsed: ItemId[];
}

export type BattleAction = { type: 'attack' } | { type: 'special' } | { type: 'defend' } | { type: 'switch'; to: number } | { type: 'item'; item: ItemId };

export type BattleEvent =
  | { type: 'act'; side: Side; kind: 'attack' | 'special' | 'defend' }
  | { type: 'hit'; side: Side; amount: number; mult: number; crit: boolean; special: boolean; element: Element }
  | { type: 'heal'; side: Side; amount: number }
  | { type: 'status'; side: Side; text: string }
  | { type: 'faint'; side: Side }
  | { type: 'switch'; side: Side; to: number }
  | { type: 'end' };

export interface Step {
  event: BattleEvent;
  state: BattleState;
}

let logId = 0;
const other = (s: Side): Side => (s === 'player' ? 'enemy' : 'player');
const clone = (s: BattleState): BattleState => structuredClone(s);

export function toFighter(m: Monster): Fighter {
  const s = monsterStats(m);
  return {
    uid: m.uid, name: m.name, element: m.element, rarity: m.rarity, level: m.level, image: m.image,
    maxHp: s.hp, hp: s.hp, attack: s.attack, defense: s.defense, speed: s.speed,
    ability: activeAbility(m), cooldown: 0, defending: false, shield: 0, burn: 0, stunned: false,
    buffs: { atk: 0, def: 0, spd: 0 }, dmgDealt: 0, kos: 0, played: false, form: m.form ?? 0,
  };
}

const buffed = (v: number, turns: number) => (turns > 0 ? v * (1 + BUFF_PCT / 100) : v);
export const effAttack = (f: Fighter) => buffed(f.attack, f.buffs.atk);
export const effDefense = (f: Fighter) => buffed(f.defense, f.buffs.def);
export const effSpeed = (f: Fighter) => buffed(f.speed, f.buffs.spd);

const RIVALS = ['Kael the Wanderer', 'Lyra Stormborn', 'Old Man Fenwick', 'Vex of the Hollow', 'Captain Mira', 'Sable Nightshade', 'Orin Brightforge', 'Juniper Vale'];

export function generateOpponent(team: Monster[], difficulty: Difficulty): { monsters: Monster[]; rival: string } {
  const avg = team.reduce((a, m) => a + m.level, 0) / Math.max(1, team.length);
  const level = Math.max(1, Math.round(avg + DIFFICULTY[difficulty].offset));
  const pool = [...SPECIES].sort(() => Math.random() - 0.5);
  let picks = pool.slice(0, 3);
  if (difficulty === 'champion' && !picks.some((p) => p.rarity === 'legendary')) {
    const legend = pool.find((p) => p.rarity === 'legendary' && !picks.includes(p))!;
    picks = [legend, ...picks.slice(0, 2)];
  }
  if (difficulty === 'rookie') {
    // Rookies avoid stacking legendaries.
    picks = picks.map((p) => (p.rarity === 'legendary' ? pool.find((q) => q.rarity !== 'legendary' && !picks.includes(q)) ?? p : p));
  }
  const monsters = picks.map((s, i) => speciesToMonster(s, Math.max(1, level + (i === 0 ? 0 : Math.round(Math.random() * 2 - 1)))));
  return { monsters, rival: RIVALS[Math.floor(Math.random() * RIVALS.length)] };
}

export function createBattle(team: Monster[], foes: Monster[], difficulty: Difficulty, rival: string, inventory: Record<ItemId, number>): BattleState {
  const state: BattleState = {
    player: team.map(toFighter),
    enemy: foes.map(toFighter),
    active: { player: 0, enemy: 0 },
    round: 1,
    log: [],
    outcome: null,
    needsSwitch: false,
    difficulty,
    rival,
    specialsUsed: 0,
    inventory: { ...inventory },
    itemsUsed: [],
  };
  state.player[0].played = true;
  pushLog(state, 'system', `${rival} challenges you to a battle!`);
  pushLog(state, 'system', `Go, ${state.player[0].name}! ${rival} sends out ${state.enemy[0].name}!`);
  return state;
}

function pushLog(s: BattleState, side: LogEntry['side'], text: string, tone: LogEntry['tone'] = 'neutral') {
  s.log = [...s.log.slice(-40), { id: ++logId, side, text, tone }];
}

const activeOf = (s: BattleState, side: Side) => s[side][s.active[side]];
const alive = (f: Fighter) => f.hp > 0;
const reserves = (s: BattleState, side: Side) =>
  s[side].map((f, i) => ({ f, i })).filter(({ f, i }) => alive(f) && i !== s.active[side]);

export function calcDamage(att: Fighter, def: Fighter, pow: number, pierce: boolean, rng = Math.random) {
  const d = pierce ? effDefense(def) * 0.5 : effDefense(def);
  const a = effAttack(att);
  const mult = elementMultiplier(att.element, def.element);
  const crit = rng() < 0.08;
  let dmg = pow * (a / (a + d)) * 1.3 * mult * (0.9 + rng() * 0.2) * (crit ? 1.5 : 1);
  if (def.defending) dmg *= 0.5;
  if (def.shield > 0) dmg *= 0.5;
  return { amount: Math.max(1, Math.round(dmg)), mult, crit };
}

/** Pick the computer's move. */
export function chooseAiAction(s: BattleState): BattleAction {
  const me = activeOf(s, 'enemy');
  const foe = activeOf(s, 'player');
  const d = s.difficulty;
  const hpPct = me.hp / me.maxHp;
  const incoming = elementMultiplier(foe.element, me.element);
  const outs = reserves(s, 'enemy');

  if (d !== 'rookie' && incoming > 1 && hpPct < 0.75 && outs.length) {
    const better = outs.find(({ f }) => elementMultiplier(foe.element, f.element) <= 1 && elementMultiplier(f.element, foe.element) >= 1);
    if (better && Math.random() < (d === 'champion' ? 0.65 : 0.35)) return { type: 'switch', to: better.i };
  }
  if (me.cooldown === 0) {
    const want = me.ability.effect === 'heal' ? hpPct < 0.6 || Math.random() < 0.4 : true;
    const chance = d === 'rookie' ? 0.45 : d === 'veteran' ? 0.75 : 0.9;
    if (want && Math.random() < chance) return { type: 'special' };
  }
  if (hpPct < 0.35 && Math.random() < (d === 'rookie' ? 0.15 : 0.25)) return { type: 'defend' };
  return { type: 'attack' };
}

function doSwitch(s: BattleState, side: Side, to: number, steps: Step[]) {
  const from = activeOf(s, side);
  s.active[side] = to;
  const next = activeOf(s, side);
  next.defending = false;
  next.played = true;
  const who = side === 'player' ? 'You' : s.rival;
  pushLog(s, side, alive(from) ? `${who} recalled ${from.name} and sent out ${next.name}!` : `${who} sent out ${next.name}!`);
  steps.push({ event: { type: 'switch', side, to }, state: clone(s) });
}

function doStrike(s: BattleState, side: Side, special: boolean, steps: Step[]) {
  const me = activeOf(s, side);
  const foe = activeOf(s, other(side));
  const ab = me.ability;
  const pow = special ? ab.power : BASIC_POWER;
  const pierce = special && ab.effect === 'pierce';

  if (special) {
    me.cooldown = ab.cooldown + 1;
    if (side === 'player') s.specialsUsed++;
    pushLog(s, side, `${me.name} unleashes ${ab.name}!`, side === 'player' ? 'good' : 'bad');
  } else {
    pushLog(s, side, `${me.name} attacks!`);
  }
  steps.push({ event: { type: 'act', side, kind: special ? 'special' : 'attack' }, state: clone(s) });

  const hadShield = foe.shield > 0;
  const { amount, mult, crit } = calcDamage(me, foe, pow, pierce);
  const dealt = Math.min(foe.hp, amount);
  foe.hp = Math.max(0, foe.hp - amount);
  me.dmgDealt += dealt;
  if (foe.hp <= 0) me.kos++;
  if (hadShield) foe.shield--;
  let note = `${foe.name} takes ${amount} damage.`;
  if (crit) note = `Critical hit! ` + note;
  if (mult > 1) note += ' It\'s super effective!';
  if (mult < 1) note += ' It\'s not very effective…';
  if (hadShield) note += ' (shielded)';
  pushLog(s, other(side), note, mult > 1 ? 'super' : mult < 1 ? 'weak' : 'neutral');
  steps.push({ event: { type: 'hit', side: other(side), amount, mult, crit, special, element: me.element }, state: clone(s) });

  if (special) {
    switch (ab.effect) {
      case 'burn':
        if (alive(foe)) {
          foe.burn = 3;
          pushLog(s, other(side), `${foe.name} is burning!`, 'bad');
          steps.push({ event: { type: 'status', side: other(side), text: 'Burning' }, state: clone(s) });
        }
        break;
      case 'stun':
        if (alive(foe) && Math.random() < 0.4) {
          foe.stunned = true;
          pushLog(s, other(side), `${foe.name} is stunned!`, 'bad');
          steps.push({ event: { type: 'status', side: other(side), text: 'Stunned' }, state: clone(s) });
        }
        break;
      case 'shield':
        me.shield = 2;
        pushLog(s, side, `${me.name} raises a shield!`, 'good');
        steps.push({ event: { type: 'status', side, text: 'Shielded' }, state: clone(s) });
        break;
      case 'heal':
      case 'drain': {
        const heal = Math.round(ab.effect === 'heal' ? me.maxHp * 0.25 : amount * 0.5);
        const real = Math.min(heal, me.maxHp - me.hp);
        if (real > 0) {
          me.hp += real;
          pushLog(s, side, `${me.name} recovers ${real} HP.`, 'good');
          steps.push({ event: { type: 'heal', side, amount: real }, state: clone(s) });
        }
        break;
      }
      case 'pierce':
        break;
    }
  }

  if (!alive(foe)) {
    pushLog(s, other(side), `${foe.name} was defeated!`, other(side) === 'enemy' ? 'good' : 'bad');
    steps.push({ event: { type: 'faint', side: other(side) }, state: clone(s) });
  }
}

function act(s: BattleState, side: Side, action: BattleAction, steps: Step[]) {
  if (s.outcome) return;
  const me = activeOf(s, side);
  if (!alive(me)) return;
  if (action.type === 'switch') return doSwitch(s, side, action.to, steps);
  if (me.stunned) {
    me.stunned = false;
    pushLog(s, side, `${me.name} is stunned and can't move!`, 'weak');
    steps.push({ event: { type: 'status', side, text: 'Stunned!' }, state: clone(s) });
    return;
  }
  if (action.type === 'item') {
    const item = getItem(action.item);
    const left = (s.inventory[action.item] ?? 0) - s.itemsUsed.filter((i) => i === action.item).length;
    if (left <= 0 || s.itemsUsed.length >= ITEMS_PER_BATTLE) return;
    s.itemsUsed = [...s.itemsUsed, action.item];
    if (action.item === 'potion') {
      const heal = Math.min(Math.round(me.maxHp * 0.4), me.maxHp - me.hp);
      me.hp += heal;
      pushLog(s, side, `You used ${item.name}! ${me.name} recovers ${heal} HP.`, 'good');
      steps.push({ event: { type: 'heal', side, amount: heal }, state: clone(s) });
    } else {
      const key = action.item === 'elixir' ? 'atk' : action.item === 'tonic' ? 'def' : 'spd';
      me.buffs = { ...me.buffs, [key]: BUFF_TURNS + 1 };
      const stat = key === 'atk' ? 'Attack' : key === 'def' ? 'Defense' : 'Speed';
      pushLog(s, side, `You used ${item.name}! ${me.name}'s ${stat} rose by ${BUFF_PCT}%.`, 'good');
      steps.push({ event: { type: 'status', side, text: `${stat} ↑` }, state: clone(s) });
    }
    return;
  }
  if (action.type === 'defend') {
    me.defending = true;
    const heal = Math.min(Math.round(me.maxHp * 0.06), me.maxHp - me.hp);
    me.hp += heal;
    pushLog(s, side, `${me.name} braces for impact${heal ? ` and recovers ${heal} HP` : ''}.`);
    steps.push({ event: { type: 'act', side, kind: 'defend' }, state: clone(s) });
    return;
  }
  doStrike(s, side, action.type === 'special' && me.cooldown === 0, steps);
  checkOutcome(s);
}

function checkOutcome(s: BattleState) {
  if (s.enemy.every((f) => !alive(f))) s.outcome = 'won';
  else if (s.player.every((f) => !alive(f))) s.outcome = 'lost';
}

function endOfRound(s: BattleState, steps: Step[]) {
  for (const side of ['player', 'enemy'] as Side[]) {
    const f = activeOf(s, side);
    if (alive(f) && f.burn > 0 && !s.outcome) {
      const dmg = Math.max(1, Math.round(f.maxHp * 0.06));
      f.hp = Math.max(0, f.hp - dmg);
      f.burn--;
      pushLog(s, side, `${f.name} is hurt by its burn (${dmg}).`, side === 'enemy' ? 'good' : 'bad');
      steps.push({ event: { type: 'hit', side, amount: dmg, mult: 1, crit: false, special: false, element: 'fire' }, state: clone(s) });
      if (!alive(f)) {
        pushLog(s, side, `${f.name} was defeated!`, side === 'enemy' ? 'good' : 'bad');
        steps.push({ event: { type: 'faint', side }, state: clone(s) });
      }
      checkOutcome(s);
    }
  }
  for (const side of ['player', 'enemy'] as Side[]) {
    for (const f of s[side]) {
      f.defending = false;
      if (f.cooldown > 0) f.cooldown--;
      f.buffs = { atk: Math.max(0, f.buffs.atk - 1), def: Math.max(0, f.buffs.def - 1), spd: Math.max(0, f.buffs.spd - 1) };
    }
  }
  s.round++;

  if (!s.outcome) {
    if (!alive(activeOf(s, 'enemy'))) {
      const outs = reserves(s, 'enemy');
      const foe = activeOf(s, 'player');
      outs.sort((a, b) => elementMultiplier(b.f.element, foe.element) - elementMultiplier(a.f.element, foe.element));
      doSwitch(s, 'enemy', outs[0].i, steps);
    }
    if (!alive(activeOf(s, 'player'))) s.needsSwitch = true;
  }
  if (s.outcome) {
    pushLog(s, 'system', s.outcome === 'won' ? 'Victory! The arena roars!' : 'Your team has fallen…', s.outcome === 'won' ? 'good' : 'bad');
  }
  steps.push({ event: { type: 'end' }, state: clone(s) });
}

/** Resolve a full round. Returns animatable steps; the last step holds the final state. */
export function resolveRound(prev: BattleState, playerAction: BattleAction): Step[] {
  const s = clone(prev);
  const steps: Step[] = [];
  const enemyAction = chooseAiAction(s);

  const queue: { side: Side; action: BattleAction; prio: number }[] = [
    { side: 'player', action: playerAction, prio: 0 },
    { side: 'enemy', action: enemyAction, prio: 0 },
  ];
  for (const q of queue) {
    const f = activeOf(s, q.side);
    q.prio = q.action.type === 'switch' ? 10000 : q.action.type === 'defend' || q.action.type === 'item' ? 5000 : effSpeed(f) + Math.random();
  }
  queue.sort((a, b) => b.prio - a.prio);
  for (const q of queue) act(s, q.side, q.action, steps);
  endOfRound(s, steps);
  return steps;
}

/** Player replaces a defeated monster (free action). */
export function forcedSwitch(prev: BattleState, to: number): Step[] {
  const s = clone(prev);
  s.needsSwitch = false;
  const steps: Step[] = [];
  doSwitch(s, 'player', to, steps);
  return steps;
}

export interface MonsterResult extends Performance {
  xp: number;
  formDelta: number;
}

/**
 * Match results.
 * - Coins & Summoner XP: base by result × difficulty, plus a bonus for team performance.
 * - Each monster that fought gets a grade (S–D) → XP multiplier and a form change (+2 … −2).
 * - Monsters that never entered the arena get 30% XP and keep their form.
 */
export function computeResults(s: BattleState) {
  const d = DIFFICULTY[s.difficulty];
  const won = s.outcome === 'won';
  const avg = s.enemy.reduce((a, f) => a + f.level, 0) / s.enemy.length;
  const enemyHp = s.enemy.reduce((a, f) => a + f.maxHp, 0);
  const baseMonsterXp = Math.round((won ? 50 + avg * 8 : 22 + avg * 3) * d.xpMult);

  const monsters: MonsterResult[] = s.player.map((f) => {
    if (!f.played) {
      return { uid: f.uid, name: f.name, played: false, grade: null, score: 0, damage: 0, kos: 0, survived: true, xp: Math.round(baseMonsterXp * BENCH_XP_MULT), formDelta: 0 };
    }
    let score = scorePerformance({ damage: f.dmgDealt, kos: f.kos, hp: f.hp, maxHp: f.maxHp }, enemyHp);
    if (!won) score = Math.min(score, 69); // no S/A grades on a loss… unless you earned it before falling
    const grade = gradeFor(score);
    const meta = GRADE_META[grade];
    return { uid: f.uid, name: f.name, played: true, grade, score, damage: f.dmgDealt, kos: f.kos, survived: f.hp > 0, xp: Math.round(baseMonsterXp * meta.xpMult), formDelta: meta.form };
  });

  const played = monsters.filter((m) => m.played);
  const teamScore = played.length ? played.reduce((a, m) => a + m.score, 0) / played.length : 0;
  const coins = won ? Math.round((60 + avg * 12 + teamScore * 0.8) * d.coinMult) : Math.round(15 + teamScore * 0.3);
  const playerXp = won ? Math.round((70 + avg * 8 + teamScore * 0.5) * d.xpMult) : Math.round(25 + teamScore * 0.25);
  return { coins, playerXp, monsters, teamScore: Math.round(teamScore), itemsUsed: s.itemsUsed };
}
