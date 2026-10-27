import type { Achievement, DailyQuest, PlayerState } from './types';
import { SPECIES } from './monsters';
import { summonerXpToNext } from './rules';

export const playerXpToNext = summonerXpToNext;

export function addPlayerXp(level: number, xp: number, amount: number) {
  let gained = 0;
  xp += amount;
  while (xp >= playerXpToNext(level)) {
    xp -= playerXpToNext(level);
    level++;
    gained++;
  }
  return { level, xp, gained };
}

export const todayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function dayDiff(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

/** Daily login reward: grows with the streak, big bonus every 7th day. */
export function dailyRewardFor(streak: number) {
  const day = ((streak - 1) % 7) + 1;
  return { coins: day === 7 ? 400 : 50 + day * 25, xp: day === 7 ? 120 : 30 + day * 5, day };
}

export const DAILY_QUESTS: DailyQuest[] = [
  { id: 'q_win2', title: 'Win 2 battles', target: 2, reward: { coins: 120, xp: 60 }, metric: 'wins' },
  { id: 'q_special5', title: 'Use 5 special abilities', target: 5, reward: { coins: 80, xp: 40 }, metric: 'specials' },
  { id: 'q_create', title: 'Create a new monster', target: 1, reward: { coins: 100, xp: 50 }, metric: 'creates' },
  { id: 'q_upgrade', title: 'Buy 2 upgrades in the Shop', target: 2, reward: { coins: 90, xp: 45 }, metric: 'upgrades' },
];

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_win', name: 'First Blood', description: 'Win your first battle', reward: 100 },
  { id: 'creator', name: 'Monster Maker', description: 'Create your first monster', reward: 100 },
  { id: 'streak3', name: 'Unstoppable', description: 'Win 3 battles in a row', reward: 200 },
  { id: 'veteran10', name: 'Arena Veteran', description: 'Win 10 battles', reward: 300 },
  { id: 'lvl10', name: 'Prodigy', description: 'Raise a monster to level 10', reward: 250 },
  { id: 'sgrade', name: 'Flawless', description: 'Earn an S grade in a match', reward: 150 },
  { id: 'peak', name: 'Peak Form', description: 'Get a monster to +5 form', reward: 200 },
  { id: 'champion', name: 'Champion Slayer', description: 'Defeat a Champion team', reward: 400 },
  { id: 'bestiary', name: 'Master Collector', description: 'Own every bestiary species', reward: 500 },
  { id: 'hoarder', name: 'Treasure Hoard', description: 'Hold 2,000 coins at once', reward: 150 },
];

export function earnedAchievements(p: PlayerState): string[] {
  const owned = new Set(p.monsters.map((m) => m.speciesId).filter(Boolean));
  const checks: Record<string, boolean> = {
    first_win: p.stats.wins >= 1,
    creator: p.stats.created >= 1,
    streak3: p.stats.bestStreak >= 3,
    veteran10: p.stats.wins >= 10,
    lvl10: p.monsters.some((m) => m.level >= 10),
    sgrade: p.monsters.some((m) => m.lastGrade === 'S'),
    peak: p.monsters.some((m) => (m.form ?? 0) >= 5),
    champion: p.stats.championWins >= 1,
    bestiary: SPECIES.every((s) => owned.has(s.id)),
    hoarder: p.coins >= 2000,
  };
  return ACHIEVEMENTS.filter((a) => checks[a.id] && !p.achievements.includes(a.id)).map((a) => a.id);
}

/** Collection milestones reward total monsters owned. */
export const MILESTONES = [
  { count: 15, coins: 150, label: '15 monsters' },
  { count: 20, coins: 300, label: '20 monsters' },
  { count: 25, coins: 500, label: '25 monsters' },
  { count: 35, coins: 1000, label: '35 monsters' },
];
