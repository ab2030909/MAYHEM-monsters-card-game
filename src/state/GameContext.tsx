import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Grade, ItemId, Monster, PlayerState } from '../game/types';
import { getSpecies, SPECIES, STARTER_IDS, UNLOCKS } from '../game/monsters';
import { revealMonster } from '../components/fx';
import { sfx } from '../services/sound';
import { addMonsterXp, normalizeMonster, speciesToMonster } from '../game/stats';
import { ACHIEVEMENTS, addPlayerXp, DAILY_QUESTS, dailyRewardFor, dayDiff, earnedAchievements, MILESTONES, todayKey } from '../game/progression';
import { boostCost, boostRankCap, clampForm, getItem, getSkill, monsterLevelCap, skillsFor, STAT_LABEL, SUMMONER_LEVEL_COINS, type StatKey } from '../game/rules';
import { computeResults, type BattleState, type MonsterResult } from '../game/battle';
import { storage } from '../services/persistence';

export interface Toast {
  id: number;
  title: string;
  body?: string;
  tone?: 'success' | 'info' | 'warning' | 'error' | 'legendary';
  image?: string;
}

export interface BattleSummary {
  outcome: 'won' | 'lost';
  coins: number;
  playerXp: number;
  teamScore: number;
  monsters: (MonsterResult & { levelBefore: number; levelAfter: number; formBefore: number; formAfter: number; capped: boolean })[];
  playerLevelUp: number | null;
  unlockable: string[];
  itemsUsed: ItemId[];
}

const SAVE_VERSION = 2;
const STARTER_INVENTORY: Record<ItemId, number> = { potion: 2, elixir: 1, tonic: 1, feather: 1 };

function freshPlayer(): PlayerState {
  const monsters = STARTER_IDS.map((id) => speciesToMonster(getSpecies(id)!, 1));
  const pick = (id: string) => monsters.find((m) => m.speciesId === id)!.uid;
  return {
    version: SAVE_VERSION,
    inventory: { ...STARTER_INVENTORY },
    name: 'Summoner',
    level: 1,
    xp: 0,
    coins: 300,
    monsters,
    team: [pick('emberclaw'), pick('bubblefin'), pick('voltbyte')],
    unlockedSpecies: [...STARTER_IDS],
    achievements: [],
    claimedMilestones: [],
    stats: { battles: 0, wins: 0, losses: 0, winStreak: 0, bestStreak: 0, created: 0, specialsUsed: 0, championWins: 0 },
    daily: { lastClaimDate: null, streak: 0, questDate: todayKey(), questProgress: {}, questClaimed: [] },
    uploads: [],
    discovered: [...STARTER_IDS],
  };
}

/** Load a save and migrate older versions. v1 → v2 resets every monster to level 1 (new level system). */
function hydrate(saved: PlayerState | null): PlayerState {
  if (!saved || !Array.isArray(saved.monsters)) return freshPlayer();
  const f = freshPlayer();
  let p: PlayerState = { ...f, ...saved, stats: { ...f.stats, ...saved.stats }, daily: { ...f.daily, ...saved.daily }, inventory: { ...f.inventory, ...(saved.inventory ?? {}) } };
  p = { ...p, monsters: p.monsters.map(normalizeMonster) };
  if ((saved.version ?? 1) < 2) {
    p = { ...p, version: SAVE_VERSION, monsters: p.monsters.map((m) => ({ ...m, level: 1, xp: 0, form: 0 })) };
  }
  return p;
}

interface GameApi {
  player: PlayerState;
  toasts: Toast[];
  toast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
  dailyAvailable: boolean;
  levelCap: number;
  claimDaily: () => void;
  claimQuest: (id: string) => void;
  claimMilestone: (count: number) => void;
  addCustomMonster: (m: Monster, cost: number) => boolean;
  spendCoins: (n: number) => boolean;
  buyBoost: (uid: string, stat: StatKey) => boolean;
  learnSkill: (uid: string, skillId: string) => boolean;
  equipSkill: (uid: string, skillId: string | null) => void;
  buyItem: (id: ItemId, qty?: number) => boolean;
  toggleFavorite: (uid: string) => void;
  releaseMonster: (uid: string) => void;
  setTeam: (uids: string[]) => void;
  unlockSpecies: (id: string) => boolean;
  applyBattle: (s: BattleState) => BattleSummary;
  recordUpload: (publicId: string) => void;
  rename: (name: string) => void;
  resetProgress: () => void;
}

const Ctx = createContext<GameApi | null>(null);
let toastId = 0;

export function GameProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<PlayerState>(() => hydrate(storage.load()));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const ref = useRef(player);
  const saveErrorShown = useRef(false);

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = ++toastId;
    setToasts((ts) => [...ts.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), t.tone === 'legendary' ? 6000 : 4200);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((ts) => ts.filter((x) => x.id !== id)), []);

  /** Apply automatic rules (daily reset, achievements, unlock notices), then commit. */
  const commit = useCallback(
    (next: PlayerState) => {
      const notes: Omit<Toast, 'id'>[] = [];
      let p = next;
      const today = todayKey();
      if (p.daily.questDate !== today) p = { ...p, daily: { ...p.daily, questDate: today, questProgress: {}, questClaimed: [] } };

      const prevLevel = ref.current.level;
      if (p.level > prevLevel) {
        UNLOCKS.filter((u) => u.level > prevLevel && u.level <= p.level && !p.unlockedSpecies.includes(u.speciesId)).forEach((u) => {
          const s = getSpecies(u.speciesId)!;
          notes.push({ title: `${s.name} can now be unlocked!`, body: `Level ${u.level} reached · costs ${u.coins} coins`, tone: 'legendary', image: (s.image as { path: string }).path });
        });
      }
      const newAch = earnedAchievements(p);
      if (newAch.length) {
        const coins = newAch.reduce((a, id) => a + (ACHIEVEMENTS.find((x) => x.id === id)?.reward ?? 0), 0);
        p = { ...p, achievements: [...p.achievements, ...newAch], coins: p.coins + coins };
        newAch.forEach((id) => {
          const a = ACHIEVEMENTS.find((x) => x.id === id)!;
          notes.push({ title: `Achievement: ${a.name}`, body: `${a.description} · +${a.reward} coins`, tone: 'success' });
        });
      }
      ref.current = p;
      setPlayer(p);
      notes.forEach(toast);
      return p;
    },
    [toast],
  );

  useEffect(() => {
    const r = storage.save(player);
    if (!r.ok && !saveErrorShown.current) {
      saveErrorShown.current = true;
      toast({ title: 'Progress not saved', body: r.error, tone: 'error' });
    }
    if (r.ok) saveErrorShown.current = false;
  }, [player, toast]);

  useEffect(() => {
    commit(ref.current);
  }, [commit]);

  const bumpQuest = (p: PlayerState, metric: string, n = 1): PlayerState => {
    const progress = { ...p.daily.questProgress };
    DAILY_QUESTS.filter((q) => q.metric === metric).forEach((q) => (progress[q.id] = Math.min(q.target, (progress[q.id] ?? 0) + n)));
    return { ...p, daily: { ...p.daily, questProgress: progress } };
  };

  const grantPlayerXp = (p: PlayerState, xp: number): { p: PlayerState; leveled: number | null } => {
    const r = addPlayerXp(p.level, p.xp, xp);
    return { p: { ...p, level: r.level, xp: r.xp, coins: p.coins + r.gained * SUMMONER_LEVEL_COINS }, leveled: r.gained ? r.level : null };
  };

  const updateMonster = (p: PlayerState, uid: string, fn: (m: Monster) => Monster): PlayerState => ({ ...p, monsters: p.monsters.map((m) => (m.uid === uid ? fn(m) : m)) });

  const api = useMemo<GameApi>(() => {
    const cur = () => ref.current;
    const short = (need: number, have: number) => toast({ title: 'Not enough coins', body: `Needs ${need} coins — you have ${have}.`, tone: 'warning' });
    return {
      player,
      toasts,
      toast,
      dismissToast,
      dailyAvailable: player.daily.lastClaimDate !== todayKey(),
      levelCap: monsterLevelCap(player.level),
      claimDaily() {
        const p = cur();
        const today = todayKey();
        if (p.daily.lastClaimDate === today) return;
        const streak = p.daily.lastClaimDate && dayDiff(p.daily.lastClaimDate, today) === 1 ? p.daily.streak + 1 : 1;
        const r = dailyRewardFor(streak);
        const { p: np, leveled } = grantPlayerXp({ ...p, coins: p.coins + r.coins, daily: { ...p.daily, lastClaimDate: today, streak } }, r.xp);
        commit(np);
        sfx.reward();
        toast({ title: `Day ${r.day} reward claimed!`, body: `+${r.coins} coins · +${r.xp} XP`, tone: 'success' });
        if (leveled) setTimeout(() => sfx.levelUp(), 900), toast({ title: `Summoner level ${leveled}!`, body: `+${SUMMONER_LEVEL_COINS} bonus coins · monster cap now Lv ${monsterLevelCap(leveled)}`, tone: 'legendary' });
      },
      claimQuest(id) {
        const p = cur();
        const q = DAILY_QUESTS.find((x) => x.id === id);
        if (!q || p.daily.questClaimed.includes(id) || (p.daily.questProgress[id] ?? 0) < q.target) return;
        const { p: np, leveled } = grantPlayerXp({ ...p, coins: p.coins + q.reward.coins, daily: { ...p.daily, questClaimed: [...p.daily.questClaimed, id] } }, q.reward.xp);
        commit(np);
        sfx.reward();
        toast({ title: 'Quest complete!', body: `${q.title} · +${q.reward.coins} coins`, tone: 'success' });
        if (leveled) setTimeout(() => sfx.levelUp(), 900), toast({ title: `Summoner level ${leveled}!`, body: `+${SUMMONER_LEVEL_COINS} bonus coins`, tone: 'legendary' });
      },
      claimMilestone(count) {
        const p = cur();
        const m = MILESTONES.find((x) => x.count === count);
        if (!m || p.claimedMilestones.includes(count) || p.monsters.length < count) return;
        commit({ ...p, coins: p.coins + m.coins, claimedMilestones: [...p.claimedMilestones, count] });
        sfx.reward();
        toast({ title: 'Collection milestone!', body: `${m.label} · +${m.coins} coins`, tone: 'success' });
      },
      addCustomMonster(m, cost) {
        const p = cur();
        if (p.coins < cost) return false;
        let np: PlayerState = { ...p, coins: p.coins - cost, monsters: [...p.monsters, normalizeMonster(m)], stats: { ...p.stats, created: p.stats.created + 1 } };
        np = bumpQuest(np, 'creates');
        commit(np);
        revealMonster({ name: m.name, element: m.element, rarity: m.rarity, image: m.image, label: 'Monster Created!' });
        return true;
      },
      spendCoins(n) {
        const p = cur();
        if (p.coins < n) return false;
        commit({ ...p, coins: p.coins - n });
        return true;
      },
      buyBoost(uid, stat) {
        const p = cur();
        const m = p.monsters.find((x) => x.uid === uid);
        if (!m) return false;
        const rank = m.boosts[stat];
        const cap = boostRankCap(m.level);
        if (rank >= cap) {
          toast({ title: 'Boost limit reached', body: `${m.name} needs level ${rank + 1} for ${STAT_LABEL[stat]} rank ${rank + 1}.`, tone: 'warning' });
          return false;
        }
        const cost = boostCost(rank);
        if (p.coins < cost) return short(cost, p.coins), false;
        let np = updateMonster({ ...p, coins: p.coins - cost }, uid, (x) => ({ ...x, boosts: { ...x.boosts, [stat]: rank + 1 } }));
        np = bumpQuest(np, 'upgrades');
        commit(np);
        sfx.upgrade();
        toast({ title: `${m.name}: ${STAT_LABEL[stat]} rank ${rank + 1}`, body: `-${cost} coins · +4% ${STAT_LABEL[stat]}`, tone: 'success' });
        return true;
      },
      learnSkill(uid, skillId) {
        const p = cur();
        const m = p.monsters.find((x) => x.uid === uid);
        const sk = getSkill(skillId);
        if (!m || !sk || m.skills.includes(skillId) || !skillsFor(m).some((s) => s.id === skillId)) return false;
        if (m.level < sk.level) {
          toast({ title: `${sk.name} needs level ${sk.level}`, body: `${m.name} is level ${m.level}.`, tone: 'warning' });
          return false;
        }
        if (p.coins < sk.cost) return short(sk.cost, p.coins), false;
        let np = updateMonster({ ...p, coins: p.coins - sk.cost }, uid, (x) => ({ ...x, skills: [...x.skills, skillId], equippedSkill: skillId }));
        np = bumpQuest(np, 'upgrades');
        commit(np);
        sfx.learn();
        toast({ title: `${m.name} learned ${sk.name}!`, body: 'Equipped as its special ability.', tone: 'success' });
        return true;
      },
      equipSkill(uid, skillId) {
        const p = cur();
        const m = p.monsters.find((x) => x.uid === uid);
        if (!m || (skillId && !m.skills.includes(skillId))) return;
        commit(updateMonster(p, uid, (x) => ({ ...x, equippedSkill: skillId })));
      },
      buyItem(id, qty = 1) {
        const p = cur();
        const item = getItem(id);
        const cost = item.cost * qty;
        if (p.coins < cost) return short(cost, p.coins), false;
        commit({ ...p, coins: p.coins - cost, inventory: { ...p.inventory, [id]: (p.inventory[id] ?? 0) + qty } });
        sfx.purchase();
        toast({ title: `Bought ${qty}× ${item.name}`, body: `-${cost} coins`, tone: 'success' });
        return true;
      },
      toggleFavorite(uid) {
        commit(updateMonster(cur(), uid, (x) => ({ ...x, favorite: !x.favorite })));
      },
      releaseMonster(uid) {
        const p = cur();
        const m = p.monsters.find((x) => x.uid === uid);
        if (!m || !m.custom) return;
        commit({ ...p, monsters: p.monsters.filter((x) => x.uid !== uid), team: p.team.filter((t) => t !== uid) });
        toast({ title: `${m.name} was released`, body: 'It wanders back into the wild.', tone: 'info' });
      },
      setTeam(uids) {
        commit({ ...cur(), team: uids.slice(0, 3) });
      },
      unlockSpecies(id) {
        const p = cur();
        const rule = UNLOCKS.find((u) => u.speciesId === id);
        const s = getSpecies(id);
        if (!rule || !s || p.unlockedSpecies.includes(id) || p.monsters.some((m) => m.speciesId === id)) return false;
        if (p.level < rule.level) {
          toast({ title: `Requires Summoner level ${rule.level}`, body: `You are level ${p.level}. Win battles and complete quests to level up.`, tone: 'warning' });
          return false;
        }
        if (p.coins < rule.coins) return short(rule.coins, p.coins), false;
        commit({ ...p, coins: p.coins - rule.coins, unlockedSpecies: [...p.unlockedSpecies, id], discovered: [...new Set([...p.discovered, id])], monsters: [...p.monsters, speciesToMonster(s, 1)] });
        toast({ title: `${s.name} unlocked!`, body: `Joins at level 1 — battle to raise it.`, tone: 'legendary', image: (s.image as { path: string }).path });
        revealMonster({ name: s.name, element: s.element, rarity: s.rarity, image: s.image, label: 'Unlocked!' });
        return true;
      },
      applyBattle(bs) {
        const p = cur();
        const won = bs.outcome === 'won';
        const r = computeResults(bs);
        // Summoner XP first: a level-up this match also raises the monster cap.
        const streak = won ? p.stats.winStreak + 1 : 0;
        let np: PlayerState = {
          ...p,
          coins: p.coins + r.coins,
          inventory: { ...p.inventory },
          discovered: [...new Set([...p.discovered, ...bs.enemy.map((f) => SPECIES.find((s) => s.name === f.name)?.id).filter((x): x is string => !!x)])],
          stats: {
            ...p.stats,
            battles: p.stats.battles + 1,
            wins: p.stats.wins + (won ? 1 : 0),
            losses: p.stats.losses + (won ? 0 : 1),
            winStreak: streak,
            bestStreak: Math.max(p.stats.bestStreak, streak),
            specialsUsed: p.stats.specialsUsed + bs.specialsUsed,
            championWins: p.stats.championWins + (won && bs.difficulty === 'champion' ? 1 : 0),
          },
        };
        for (const it of r.itemsUsed) np.inventory[it] = Math.max(0, (np.inventory[it] ?? 0) - 1);
        const { p: withXp, leveled } = grantPlayerXp(np, r.playerXp);
        np = withXp;
        const cap = monsterLevelCap(np.level);

        const rows: BattleSummary['monsters'] = [];
        np = {
          ...np,
          monsters: np.monsters.map((m) => {
            const res = r.monsters.find((x) => x.uid === m.uid);
            if (!res) return m;
            const formAfter = clampForm((m.form ?? 0) + res.formDelta);
            const { monster, capped } = addMonsterXp({ ...m, wins: m.wins + (won && res.played ? 1 : 0), form: formAfter, matches: (m.matches ?? 0) + (res.played ? 1 : 0), lastGrade: (res.grade ?? m.lastGrade ?? null) as Grade | null }, res.xp, cap);
            rows.push({ ...res, levelBefore: m.level, levelAfter: monster.level, formBefore: m.form ?? 0, formAfter, capped });
            return monster;
          }),
        };
        np = bumpQuest(np, 'battles');
        np = bumpQuest(np, 'specials', bs.specialsUsed);
        if (won) np = bumpQuest(np, 'wins');
        const final = commit(np);
        return {
          outcome: won ? 'won' : 'lost',
          coins: r.coins,
          playerXp: r.playerXp,
          teamScore: r.teamScore,
          monsters: bs.player.map((f) => rows.find((x) => x.uid === f.uid)!).filter(Boolean),
          playerLevelUp: leveled,
          unlockable: UNLOCKS.filter((u) => u.level > p.level && u.level <= final.level && !final.unlockedSpecies.includes(u.speciesId)).map((u) => u.speciesId),
          itemsUsed: r.itemsUsed,
        };
      },
      recordUpload(publicId) {
        const p = cur();
        commit({ ...p, uploads: [{ publicId, createdAt: Date.now() }, ...p.uploads.filter((u) => u.publicId !== publicId)].slice(0, 24) });
      },
      rename(name) {
        commit({ ...cur(), name: name.trim().slice(0, 20) || 'Summoner' });
      },
      resetProgress() {
        storage.clear();
        ref.current = freshPlayer();
        commit(ref.current);
        toast({ title: 'A fresh legend begins', body: 'Progress has been reset.', tone: 'info' });
      },
    };
  }, [player, toasts, toast, dismissToast, commit]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useGame() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useGame must be used inside GameProvider');
  return c;
}
