import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { ArrowLeftRight, ChevronRight, Crown, Feather, Flag, FlaskConical, Flame, Gauge, HeartPulse, Home, RefreshCw, Shield, ShieldHalf, Skull, Sparkles, Sword, Swords, TrendingDown, TrendingUp, Trophy, Users, Zap } from 'lucide-react';
import type { ItemId } from '../game/types';
import { GRADE_META, ITEMS, ITEMS_PER_BATTLE } from '../game/rules';
import type { Screen } from '../components/Layout';
import type { Element, Monster } from '../game/types';
import { Maximize, Minimize } from 'lucide-react';
import { ELEMENT_META, ELEMENTS, STRONG_AGAINST, elementMultiplier } from '../game/elements';
import { createBattle, DIFFICULTY, effSpeed, forcedSwitch, generateOpponent, resolveRound, type BattleAction, type BattleState, type Difficulty, type Fighter, type Side, type Step } from '../game/battle';
import { power } from '../game/stats';
import { getSpecies } from '../game/monsters';
import { useGame, type BattleSummary } from '../state/GameContext';
import { MonsterCard } from '../components/MonsterCard';
import { ElementFX } from '../components/fx';
import { setMusicMood, sfx } from '../services/sound';
import { CoinIcon, ElementBadge, ElementIcon, EmptyState, Modal, MonsterImg, Particles, RarityBadge } from '../components/ui';

const VENUES: Record<Difficulty, { name: string; image: string; filter: string; tint: string; fx: Element; color: string; pos: string }> = {
  rookie: { name: 'Verdant Ruins', image: '/art/arena.webp', filter: 'hue-rotate(70deg) saturate(1.1) brightness(0.95)', tint: 'radial-gradient(80% 60% at 50% 100%, rgba(74,222,128,0.18), transparent 70%)', fx: 'nature', color: '#86efac', pos: 'center 60%' },
  veteran: { name: 'Stormspire Citadel', image: '/art/arena.webp', filter: 'hue-rotate(185deg) saturate(1.3) brightness(0.85)', tint: 'linear-gradient(180deg, rgba(56,189,248,0.18), transparent 60%)', fx: 'electric', color: '#7dd3fc', pos: 'center 55%' },
  champion: { name: 'Infernal Throne', image: '/art/hero.webp', filter: 'saturate(1.25) brightness(0.8) contrast(1.1)', tint: 'radial-gradient(70% 60% at 50% 90%, rgba(255,90,0,0.3), transparent 70%)', fx: 'fire', color: '#fdba74', pos: '70% center' },
};

type Phase = 'setup' | 'versus' | 'fight' | 'result';

export function BattleScreen({ go }: { go: (s: Screen) => void }) {
  const g = useGame();
  const [phase, setPhase] = useState<Phase>('setup');
  useEffect(() => {
    setMusicMood(phase === 'fight' || phase === 'versus' ? 'battle' : 'menu');
    if (phase === 'versus') sfx.gong();
  }, [phase]);
  useEffect(() => () => setMusicMood('menu'), []);
  const [difficulty, setDifficulty] = useState<Difficulty>('rookie');
  const [opponent, setOpponent] = useState<{ monsters: Monster[]; rival: string } | null>(null);
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [summary, setSummary] = useState<BattleSummary | null>(null);

  const team = useMemo(() => g.player.team.map((id) => g.player.monsters.find((m) => m.uid === id)).filter((m): m is Monster => !!m), [g.player.team, g.player.monsters]);

  const findOpponent = () => {
    setOpponent(generateOpponent(team, difficulty));
    setPhase('versus');
  };
  const begin = () => {
    if (!opponent) return;
    setBattle(createBattle(team, opponent.monsters, difficulty, opponent.rival, g.player.inventory));
    setPhase('fight');
    sfx.fight();
  };
  const finish = useCallback(
    (final: BattleState) => {
      const sum = g.applyBattle(final);
      setSummary(sum);
      if (final.outcome === 'won') sfx.victory(); else sfx.defeat();
      setBattle(final);
      setPhase('result');
    },
    [g],
  );

  return (
    <div className={`mx-auto max-w-[1600px] px-3 sm:px-5 lg:px-6 ${phase === 'fight' ? 'py-2' : 'py-6 lg:py-8'}`}>
      {phase === 'setup' && <Setup team={team} difficulty={difficulty} setDifficulty={setDifficulty} onFind={findOpponent} go={go} />}
      {phase === 'versus' && opponent && <Versus team={team} opponent={opponent} difficulty={difficulty} onBegin={begin} onReroll={() => setOpponent(generateOpponent(team, difficulty))} onBack={() => setPhase('setup')} />}
      {phase === 'fight' && battle && <Fight initial={battle} onFinish={finish} />}
      {phase === 'result' && summary && battle && (
        <Result
          summary={summary}
          battle={battle}
          onAgain={() => {
            setOpponent(generateOpponent(team, difficulty));
            setPhase('versus');
          }}
          onTeam={() => setPhase('setup')}
          onHome={() => go('home')}
        />
      )}
    </div>
  );
}

/* ———————————————————————————— SETUP ———————————————————————————— */

function Setup({ team, difficulty, setDifficulty, onFind, go }: { team: Monster[]; difficulty: Difficulty; setDifficulty: (d: Difficulty) => void; onFind: () => void; go: (s: Screen) => void }) {
  const g = useGame();
  const [sort, setSort] = useState<'power' | 'level'>('power');
  const pool = useMemo(() => [...g.player.monsters].sort((a, b) => (sort === 'power' ? power(b) - power(a) : b.level - a.level)), [g.player.monsters, sort]);

  const toggle = (uid: string) => {
    const t = g.player.team;
    if (t.includes(uid)) g.setTeam(t.filter((x) => x !== uid));
    else if (t.length < 3) g.setTeam([...t, uid]);
    else g.toast({ title: 'Team is full', body: 'Tap a selected monster to remove it first.', tone: 'warning' });
  };

  if (g.player.monsters.length < 3)
    return <EmptyState icon={<Users size={28} />} title="You need three monsters" body="Create or summon more monsters to assemble a battle team." action={<button className="btn btn-primary" onClick={() => go('create')}><Sparkles size={16} /> Create a monster</button>} />;

  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="order-2 lg:order-1">
          <div className="mb-4">
            <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-orange-300/90">Battle Arena</div>
            <h1 className="font-display text-4xl tracking-wide text-white sm:text-5xl">Assemble your team</h1>
            <p className="mt-1 text-violet-200/70">Choose three monsters. The first one leads the charge.</p>
          </div>
          <div className="relative z-10 mb-7 flex items-center justify-between">
            <span className="text-sm text-violet-200/60">{g.player.monsters.length} available</span>
            <div className="flex gap-1.5">
              {(['power', 'level'] as const).map((s) => (
                <button key={s} className="chip capitalize" data-active={sort === s} onClick={() => setSort(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {pool.map((m) => {
              const idx = g.player.team.indexOf(m.uid);
              return <MonsterCard key={m.uid} monster={m} selected={idx >= 0} selectIndex={idx >= 0 ? idx : undefined} onClick={() => toggle(m.uid)} />;
            })}
          </div>
        </div>

        <aside className="setup-aside order-1 space-y-3 lg:sticky lg:top-3 lg:order-2 lg:self-start">
          <div className="panel p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-xl text-white">Your team</h3>
              <span className="text-xs font-bold text-violet-200/60">{team.length}/3</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => {
                const m = team[i];
                return m ? (
                  <button key={m.uid} onClick={() => toggle(m.uid)} className="group relative overflow-hidden rounded-xl border border-violet-400/30" title="Remove from team">
                    <MonsterImg image={m.image} size="thumb" alt={m.name} className="aspect-[3/4] w-full" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-night-950 to-transparent p-1.5 pt-6 text-left">
                      <div className="truncate text-[11px] font-bold text-white">{m.name}</div>
                      <div className="flex items-center gap-1 text-[9px] text-violet-200/70">
                        <ElementIcon element={m.element} size={9} /> Lv {m.level}
                      </div>
                    </div>
                    <span className="absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-cyan-400 text-[10px] font-extrabold text-night-950">{i + 1}</span>
                    {i === 0 && <span className="absolute right-1.5 top-1.5 rounded-full bg-orange-400 px-1.5 text-[8px] font-extrabold uppercase text-night-950">Lead</span>}
                  </button>
                ) : (
                  <div key={i} className="grid aspect-[3/4] place-items-center rounded-xl border-2 border-dashed border-white/10 text-xs text-violet-200/40">
                    Slot {i + 1}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="panel p-5">
            <h3 className="mb-3 font-display text-xl text-white">Difficulty</h3>
            <div className="space-y-2">
              {(Object.keys(DIFFICULTY) as Difficulty[]).map((d) => {
                const meta = DIFFICULTY[d];
                const active = d === difficulty;
                const Icon = d === 'rookie' ? Shield : d === 'veteran' ? Swords : Crown;
                return (
                  <button key={d} onClick={() => setDifficulty(d)} aria-pressed={active} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${active ? 'border-orange-400/60 bg-orange-500/10' : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20'}`}>
                    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${active ? 'bg-gradient-to-br from-amber-300 to-orange-500 text-night-950' : 'bg-white/5 text-violet-200'}`}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{meta.label}</span>
                        <span className="text-[10px] font-bold text-amber-200">×{meta.coinMult} rewards</span>
                      </div>
                      <div className="text-[11px] text-violet-200/60">{meta.blurb}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <button className="btn btn-ember mt-4 w-full py-3.5 text-base" disabled={team.length < 3} onClick={onFind}>
              <Swords size={18} /> {team.length < 3 ? `Pick ${3 - team.length} more` : 'Find opponent'}
            </button>
          </div>

          <TypeChart />
        </aside>
      </div>
    </div>
  );
}

function TypeChart() {
  return (
    <div className="panel p-5">
      <h3 className="mb-3 font-display text-lg text-white">Element advantages</h3>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {ELEMENTS.map((e) => (
          <div key={e} className="flex items-center gap-1.5 rounded-lg bg-white/[0.03] px-2 py-1.5">
            <ElementIcon element={e} size={13} />
            <ChevronRight size={11} className="text-violet-200/40" />
            {STRONG_AGAINST[e].map((t) => (
              <ElementIcon key={t} element={t} size={13} />
            ))}
            <span className="ml-auto text-[10px] text-emerald-300">×1.5</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ———————————————————————————— VERSUS ———————————————————————————— */

function Versus({ team, opponent, difficulty, onBegin, onReroll, onBack }: { team: Monster[]; opponent: { monsters: Monster[]; rival: string }; difficulty: Difficulty; onBegin: () => void; onReroll: () => void; onBack: () => void }) {
  const Row = ({ list, side }: { list: Monster[]; side: Side }) => (
    <div className="grid grid-cols-3 gap-3">
      {list.map((m, i) => (
        <motion.div key={m.uid} initial={{ opacity: 0, x: side === 'player' ? -40 : 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.1 }}>
          <MonsterCard monster={m} interactive={false} eager />
        </motion.div>
      ))}
    </div>
  );
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-violet-400/15">
      <img src={VENUES[difficulty].image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" style={{ filter: VENUES[difficulty].filter }} />
      <div className="absolute inset-0 bg-gradient-to-b from-night-950/70 via-night-950/60 to-night-950" />
      <Particles count={20} />
      <div className="relative p-5 sm:p-8">
        <div className="mb-6 text-center">
          <div className="match-title" data-d={difficulty}><span>{DIFFICULTY[difficulty].label} Match</span></div>
          <h2 className="font-display text-3xl text-white sm:text-4xl">{opponent.rival} wants to battle!</h2>
        </div>
        <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto_1fr]">
          <div>
            <div className="mb-2 text-sm font-bold uppercase tracking-wider text-cyan-300">Your team</div>
            <Row list={team} side="player" />
          </div>
          <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', delay: 0.4 }} className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-orange-400 to-fuchsia-600 font-display text-3xl text-white shadow-[0_0_60px_rgba(251,146,60,0.7)]">
            VS
          </motion.div>
          <div>
            <div className="mb-2 text-right text-sm font-bold uppercase tracking-wider text-orange-300">{opponent.rival}</div>
            <Row list={opponent.monsters} side="enemy" />
          </div>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button className="btn btn-ghost" onClick={onBack}>
            <Users size={16} /> Change team
          </button>
          <button className="btn btn-ghost" onClick={onReroll}>
            <RefreshCw size={16} /> New opponent
          </button>
          <button className="btn btn-ember px-8 py-3.5 text-base" onClick={onBegin}>
            <Swords size={18} /> Begin battle
          </button>
        </div>
      </div>
    </div>
  );
}

/* ———————————————————————————— FIGHT ———————————————————————————— */

interface Floater {
  id: number;
  side: Side;
  text: string;
  color: string;
  big?: boolean;
}
interface Fx {
  id: number;
  side: Side;
  kind: 'slash' | 'burst' | 'heal';
  color: string;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
let fxId = 0;

function Fight({ initial, onFinish }: { initial: BattleState; onFinish: (s: BattleState) => void }) {
  const [state, setState] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [fx, setFx] = useState<Fx[]>([]);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [confirmForfeit, setConfirmForfeit] = useState(false);
  const finished = useRef(false);
  const mounted = useRef(true);
  const controls = { player: useAnimationControls(), enemy: useAnimationControls() };
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const speed = reduced ? 0.4 : 1;

  useEffect(() => () => void (mounted.current = false), []);

  const float = (f: Omit<Floater, 'id'>) => {
    const id = ++fxId;
    setFloaters((x) => [...x, { ...f, id }]);
    setTimeout(() => mounted.current && setFloaters((x) => x.filter((y) => y.id !== id)), 1200);
  };
  const effect = (f: Omit<Fx, 'id'>) => {
    const id = ++fxId;
    setFx((x) => [...x, { ...f, id }]);
    setTimeout(() => mounted.current && setFx((x) => x.filter((y) => y.id !== id)), 800);
  };

  const play = async (steps: Step[]) => {
    setBusy(true);
    for (const step of steps) {
      if (!mounted.current) return;
      const e = step.event;
      setState(step.state);
      switch (e.type) {
        case 'act':
          if (e.kind === 'defend') {
            sfx.defend();
            float({ side: e.side, text: 'DEFEND', color: '#38bdf8' });
            await wait(500 * speed);
          } else {
            const dir = e.side === 'player' ? 1 : -1;
            controls[e.side].start({ x: [0, dir * -18, dir * 70, 0], transition: { duration: 0.45 * speed, times: [0, 0.25, 0.55, 1] } });
            { const actor = step.state[e.side][step.state.active[e.side]]; if (e.kind === 'special') sfx.special(actor.element); else sfx.attack(actor.element); }
            if (e.kind === 'special') float({ side: e.side, text: 'SPECIAL!', color: '#fbbf24' });
            await wait(330 * speed);
          }
          break;
        case 'hit': {
          const color = ELEMENT_META[e.element].color;
          sfx.hit(e.crit, e.mult > 1);
          if (step.state[e.side][step.state.active[e.side]]?.defending) sfx.block();
          effect({ side: e.side, kind: e.special ? 'burst' : 'slash', color });
          controls[e.side].start({ x: [0, -12, 10, -6, 4, 0], filter: ['brightness(2.2)', 'brightness(1)'], transition: { duration: 0.45 * speed } });
          float({ side: e.side, text: `-${e.amount}${e.crit ? '!' : ''}`, color: e.mult > 1 ? '#fb923c' : e.mult < 1 ? '#94a3b8' : '#ffffff', big: e.crit || e.mult > 1 });
          if (e.mult > 1) setTimeout(() => float({ side: e.side, text: 'Super effective!', color: '#fdba74' }), 180);
          if (e.mult < 1) setTimeout(() => float({ side: e.side, text: 'Resisted', color: '#94a3b8' }), 180);
          await wait(700 * speed);
          break;
        }
        case 'heal':
          sfx.heal();
          effect({ side: e.side, kind: 'heal', color: '#4ade80' });
          float({ side: e.side, text: `+${e.amount}`, color: '#4ade80' });
          await wait(550 * speed);
          break;
        case 'status':
          float({ side: e.side, text: e.text, color: '#c084fc' });
          await wait(500 * speed);
          break;
        case 'faint':
          sfx.faint();
          await controls[e.side].start({ opacity: [1, 0.2], y: [0, 30], filter: ['grayscale(0)', 'grayscale(1)'], transition: { duration: 0.6 * speed } });
          await wait(250 * speed);
          break;
        case 'switch':
          sfx.switchIn();
          controls[e.side].set({ opacity: 0, y: 20, x: 0, filter: 'grayscale(0) brightness(1)' });
          controls[e.side].start({ opacity: 1, y: 0, transition: { duration: 0.4 * speed } });
          await wait(550 * speed);
          break;
        case 'end':
          break;
      }
    }
    const last = steps[steps.length - 1]?.state;
    setBusy(false);
    if (last?.outcome && !finished.current) {
      finished.current = true;
      await wait(900 * speed);
      if (mounted.current) onFinish(last);
    }
  };

  const doAction = (a: BattleAction) => {
    if (busy || state.outcome || state.needsSwitch) return;
    setSwitchOpen(false);
    setItemOpen(false);
    play(resolveRound(state, a));
  };
  const doForced = (to: number) => play(forcedSwitch(state, to));

  const pa = state.player[state.active.player];
  const ea = state.enemy[state.active.enemy];
  const reserves = state.player.map((f, i) => ({ f, i })).filter(({ f, i }) => f.hp > 0 && i !== state.active.player);
  const playerFirst = effSpeed(pa) >= effSpeed(ea);
  const itemsLeft = (id: ItemId) => (state.inventory[id] ?? 0) - state.itemsUsed.filter((x) => x === id).length;
  const totalItems = ITEMS.reduce((a, it) => a + Math.max(0, itemsLeft(it.id)), 0);
  const itemSlots = ITEMS_PER_BATTLE - state.itemsUsed.length;

  // Keyboard shortcuts 1-4
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === '1') doAction({ type: 'attack' });
      if (e.key === '2' && pa.cooldown === 0) doAction({ type: 'special' });
      if (e.key === '3') doAction({ type: 'defend' });
      if (e.key === '4' && reserves.length) setSwitchOpen(true);
      if (e.key === '5' && totalItems > 0 && itemSlots > 0) setItemOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const forfeit = () => {
    if (finished.current) return;
    finished.current = true;
    setConfirmForfeit(false);
    onFinish({ ...state, outcome: 'lost', player: state.player.map((f) => ({ ...f, hp: 0 })) });
  };

  const disabled = busy || !!state.outcome || state.needsSwitch;
  const rootRef = useRef<HTMLDivElement>(null);
  const [isFull, setIsFull] = useState(false);
  useEffect(() => {
    const on = () => setIsFull(document.fullscreenElement === rootRef.current);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  const toggleFull = () => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (el.requestFullscreen) el.requestFullscreen().catch(() => setIsFull((v) => !v));
    else setIsFull((v) => !v); // fallback: CSS-only fullscreen
  };

  const venue = VENUES[state.difficulty];
  return (
    <div ref={rootRef} className={`battle-root grid gap-3 ${isFull ? 'is-full' : ''}`}>
      <div className="battle-main space-y-4">
        {/* Arena */}
        <div className={`arena-box venue-${state.difficulty} relative overflow-hidden rounded-[28px] border border-violet-400/15 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)]`}>
          <img src={venue.image} alt="" className="venue-img absolute inset-0 h-full w-full object-cover" style={{ filter: venue.filter, objectPosition: venue.pos }} />
          <div className="absolute inset-0" style={{ background: venue.tint }} />
          <div className="venue-weather absolute inset-0" aria-hidden><ElementFX element={venue.fx} count={30} /></div>
          <div className="absolute inset-0 bg-gradient-to-b from-night-950/50 via-night-950/10 to-night-950/90" />
          <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-cyan-500/10 to-transparent" />
          <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-orange-500/10 to-transparent" />
          <Particles count={14} />

          <div className="relative flex items-center justify-between px-4 pt-4 sm:px-6">
            <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs font-bold text-white backdrop-blur">Round {state.round}</span>
            <span className="hidden rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs font-semibold text-violet-100/80 backdrop-blur sm:inline">
              {playerFirst ? `${pa.name} is faster — you strike first` : `${ea.name} is faster — it strikes first`}
            </span>
            <div className="flex items-center gap-2">
              <span className="hidden rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs font-bold backdrop-blur md:inline" style={{ color: venue.color }}>{venue.name}</span>
              <button className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs font-semibold text-violet-200/70 backdrop-blur hover:text-white" onClick={toggleFull} aria-label={isFull ? 'Exit full screen' : 'Full screen'}>
                {isFull ? <Minimize size={12} /> : <Maximize size={12} />} {isFull ? 'Exit' : 'Full screen'}
              </button>
              <button className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs font-semibold text-violet-200/70 backdrop-blur hover:text-white" onClick={() => setConfirmForfeit(true)} disabled={!!state.outcome}>
                <Flag size={12} /> Forfeit
              </button>
            </div>
          </div>

          <div className="arena-floor relative grid grid-cols-2 items-end gap-3 px-3 pb-3 pt-2 sm:gap-8 sm:px-8">
            <Stage f={pa} side="player" controls={controls.player} floaters={floaters} fx={fx} versus={ea} />
            <Stage f={ea} side="enemy" controls={controls.enemy} floaters={floaters} fx={fx} versus={pa} />

          </div>

          <div className="relative grid grid-cols-2 gap-3 border-t border-white/5 bg-night-950/70 px-3 py-3 backdrop-blur sm:gap-8 sm:px-8">
            <Bench list={state.player} active={state.active.player} label="Your team" />
            <Bench list={state.enemy} active={state.active.enemy} label={state.rival} right />
          </div>
        </div>

        {/* Actions */}
        <div className="action-bar grid grid-cols-5 gap-2 sm:gap-3">
          <ActionBtn hotkey="1" icon={<Swords size={20} />} title="Attack" sub={`Power 40 · ${ELEMENT_META[pa.element].label}`} onClick={() => doAction({ type: 'attack' })} disabled={disabled} tone="violet" />
          <ActionBtn
            hotkey="2"
            icon={<Zap size={20} />}
            title={pa.ability.name}
            sub={pa.cooldown > 0 ? `Recharging · ${pa.cooldown} turn${pa.cooldown > 1 ? 's' : ''}` : `Power ${pa.ability.power} · ${pa.ability.effect}`}
            onClick={() => doAction({ type: 'special' })}
            disabled={disabled || pa.cooldown > 0}
            tone="ember"
            cooldown={pa.cooldown > 0 ? pa.cooldown / (pa.ability.cooldown + 1) : 0}
          />
          <ActionBtn hotkey="3" icon={<ShieldHalf size={20} />} title="Defend" sub="Halve damage · heal 6%" onClick={() => doAction({ type: 'defend' })} disabled={disabled} tone="blue" />
          <ActionBtn hotkey="4" icon={<ArrowLeftRight size={20} />} title="Switch" sub={reserves.length ? `${reserves.length} in reserve` : 'No reserves'} onClick={() => setSwitchOpen(true)} disabled={disabled || !reserves.length} tone="cyan" />
          <ActionBtn hotkey="5" icon={<FlaskConical size={20} />} title="Items" sub={itemSlots <= 0 ? 'Limit reached' : totalItems ? `${totalItems} in bag · ${itemSlots} use${itemSlots > 1 ? 's' : ''} left` : 'Bag empty'} onClick={() => setItemOpen(true)} disabled={disabled || !totalItems || itemSlots <= 0} tone="green" />
        </div>
        
        <p className="battle-hint text-center text-xs text-violet-200/50">{busy ? 'Resolving turn…' : state.needsSwitch ? 'Choose your next monster' : `${pa.ability.description}`}</p>
      </div>



      {/* Switch picker */}
      <Modal open={switchOpen || state.needsSwitch} onClose={() => !state.needsSwitch && setSwitchOpen(false)} label="Switch monster">
        <div className="p-6">
          <h3 className="font-display text-2xl text-white">{state.needsSwitch ? `${pa.name} fainted!` : 'Switch monster'}</h3>
          <p className="mb-4 text-sm text-violet-200/70">{state.needsSwitch ? 'Choose who enters the arena next (free action).' : 'Switching uses your turn, but happens before the opponent moves.'}</p>
          <div className="space-y-2">
            {reserves.map(({ f, i }) => {
              const mult = elementMultiplier(f.element, ea.element);
              const incoming = elementMultiplier(ea.element, f.element);
              return (
                <button key={f.uid} onClick={() => (state.needsSwitch ? doForced(i) : doAction({ type: 'switch', to: i }))} className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-2.5 text-left transition hover:border-cyan-300/50 hover:bg-cyan-300/5">
                  <MonsterImg image={f.image} size="thumb" alt={f.name} className="h-16 w-14 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{f.name}</span>
                      <ElementBadge element={f.element} compact />
                      <span className="text-xs text-violet-200/60">Lv {f.level}</span>
                    </div>
                    <HpBar f={f} small />
                  </div>
                  <div className="text-right text-[10px] font-bold">
                    {mult > 1 && <div className="text-emerald-300">Strong ↑</div>}
                    {incoming > 1 && <div className="text-red-300">Weak ↓</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Modal>

      <Modal open={itemOpen} onClose={() => setItemOpen(false)} label="Use an item">
        <div className="p-6">
          <h3 className="font-display text-2xl text-white">Use an item</h3>
          <p className="mb-4 text-sm text-violet-200/70">
            Items act before attacks and use your turn. {itemSlots} of {ITEMS_PER_BATTLE} item uses left this battle.
          </p>
          <div className="space-y-2">
            {ITEMS.map((it) => {
              const left = itemsLeft(it.id);
              return (
                <button key={it.id} disabled={left <= 0} onClick={() => doAction({ type: 'item', item: it.id })} className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-emerald-300/50 hover:bg-emerald-300/5 disabled:opacity-40">
                  <ItemIcon id={it.id} />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-white">{it.name}</div>
                    <div className="text-xs text-violet-200/70">{it.description}</div>
                  </div>
                  <span className="rounded-lg bg-black/30 px-2.5 py-1 text-sm font-bold text-white">×{Math.max(0, left)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </Modal>

      <Modal open={confirmForfeit} onClose={() => setConfirmForfeit(false)} label="Forfeit battle">
        <div className="p-6">
          <h3 className="font-display text-2xl text-white">Forfeit the battle?</h3>
          <p className="mt-1 text-sm text-violet-200/70">It counts as a loss, but you’ll still receive a small consolation reward.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn btn-ghost" onClick={() => setConfirmForfeit(false)}>
              Keep fighting
            </button>
            <button className="btn !bg-red-500/80 text-white" onClick={forfeit}>
              <Flag size={15} /> Forfeit
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Stage({ f, side, controls, floaters, fx, versus }: { f: Fighter; side: Side; controls: ReturnType<typeof useAnimationControls>; floaters: Floater[]; fx: Fx[]; versus: Fighter }) {
  const el = ELEMENT_META[f.element];
  const adv = elementMultiplier(f.element, versus.element);
  return (
    <div className={`flex flex-col ${side === 'enemy' ? 'items-end' : 'items-start'}`}>
      {/* Info plate */}
      <div className={`fighter-plate mb-3 w-full rounded-2xl border bg-night-950/75 p-2.5 backdrop-blur-md sm:p-3 ${side === 'player' ? 'border-cyan-300/25' : 'border-orange-300/25'}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-display text-base text-white sm:text-lg">{f.name}</div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <ElementBadge element={f.element} compact />
              <span className="text-[10px] font-bold text-violet-200/70">Lv {f.level}</span>
              {adv > 1 && <span className="hidden text-[9px] font-bold text-emerald-300 sm:inline">ADV</span>}
            </div>
          </div>
          <div className="flex gap-1">
            {f.burn > 0 && <StatusPip icon={<Flame size={11} />} color="#fb923c" label={`Burn ${f.burn}`} />}
            {f.shield > 0 && <StatusPip icon={<Shield size={11} />} color="#38bdf8" label={`Shield ×${f.shield}`} />}
            {f.stunned && <StatusPip icon={<Zap size={11} />} color="#facc15" label="Stunned" />}
            {f.defending && <StatusPip icon={<ShieldHalf size={11} />} color="#a5f3fc" label="Defending" />}
            {f.buffs.atk > 0 && <StatusPip icon={<Sword size={11} />} color="#fb923c" label={`Attack +30% (${f.buffs.atk})`} />}
            {f.buffs.def > 0 && <StatusPip icon={<Shield size={11} />} color="#60a5fa" label={`Defense +30% (${f.buffs.def})`} />}
            {f.buffs.spd > 0 && <StatusPip icon={<Gauge size={11} />} color="#facc15" label={`Speed +30% (${f.buffs.spd})`} />}
          </div>
        </div>
        <HpBar f={f} />
      </div>

      {/* Monster */}
      <div className="fighter-card relative w-full">
        <motion.div animate={controls} className="relative">
          <div className="idle-bob">
            <div className={`idle el-${f.element} ${f.hp <= 0 ? 'ko' : ''}`}>
              <div className="mcard" data-rarity={f.rarity} style={{ boxShadow: `0 30px 60px -20px ${el.glow}` }}>
                <div className={`mcard-inner ${f.rarity === 'legendary' ? 'foil' : ''}`}>
                  <MonsterImg image={f.image} size="card" alt={f.name} eager className="aspect-[3/4] w-full" />
                </div>
              </div>
            </div>
          </div>
          {f.hp > 0 && <ElementFX element={f.element} count={18} />}
        </motion.div>
        <div className="absolute -bottom-3 left-1/2 h-6 w-3/4 -translate-x-1/2 rounded-[50%] bg-black/60 blur-md" />

        {/* FX */}
        <div className="pointer-events-none absolute inset-0">
          {fx
            .filter((x) => x.side === side)
            .map((x) => (x.kind === 'slash' ? <div key={x.id} className="slash" style={{ ['--fx' as string]: x.color }} /> : <div key={x.id} className="burst-ring" style={{ ['--fx' as string]: x.color }} />))}
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-[30%] flex justify-center">
          <AnimatePresence>
            {floaters
              .filter((x) => x.side === side)
              .map((x, i) => (
                <motion.div
                  key={x.id}
                  initial={{ opacity: 0, y: 10, scale: 0.6 }}
                  animate={{ opacity: 1, y: -50 - i * 26, scale: x.big ? 1.35 : 1 }}
                  exit={{ opacity: 0, y: -90 }}
                  transition={{ duration: 0.5, type: 'spring' }}
                  className="absolute whitespace-nowrap font-display text-3xl sm:text-4xl"
                  style={{ color: x.color, textShadow: `0 0 18px ${x.color}, 0 3px 0 rgba(0,0,0,0.6)` }}
                >
                  {x.text}
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function StatusPip({ icon, color, label }: { icon: ReactNode; color: string; label: string }) {
  return (
    <span title={label} aria-label={label} className="grid h-6 w-6 place-items-center rounded-full border" style={{ color, borderColor: `${color}66`, background: `${color}1f` }}>
      {icon}
    </span>
  );
}

function HpBar({ f, small = false }: { f: Fighter; small?: boolean }) {
  const pct = Math.max(0, (f.hp / f.maxHp) * 100);
  const color = pct > 50 ? 'linear-gradient(90deg,#22c55e,#4ade80)' : pct > 25 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#dc2626,#f87171)';
  return (
    <div className={small ? 'mt-1.5' : 'mt-2'}>
      <div className="hp-track" style={{ height: small ? 6 : 10 }}>
        <div className="hp-ghost" style={{ width: `${pct}%` }} />
        <div className="hp-fill relative" style={{ width: `${pct}%`, background: color }} />
      </div>
      {!small && (
        <div className="mt-1 flex justify-between text-[10px] font-bold tabular-nums text-violet-100/70">
          <span>HP</span>
          <span>
            {f.hp} / {f.maxHp}
          </span>
        </div>
      )}
    </div>
  );
}

function Bench({ list, active, label, right = false }: { list: Fighter[]; active: number; label: string; right?: boolean }) {
  return (
    <div className={right ? 'text-right' : ''}>
      <div className="mb-1.5 truncate text-[10px] font-bold uppercase tracking-wider text-violet-200/50">{label}</div>
      <div className={`flex gap-2 ${right ? 'justify-end' : ''}`}>
        {list.map((f, i) => (
          <div key={f.uid} className={`relative w-12 overflow-hidden rounded-lg border sm:w-14 ${i === active ? 'border-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.6)]' : 'border-white/10'} ${f.hp <= 0 ? 'opacity-35 grayscale' : ''}`} title={`${f.name} ${f.hp}/${f.maxHp}`}>
            <MonsterImg image={f.image} size="thumb" alt={f.name} className="aspect-square w-full" />
            <div className="absolute inset-x-0 bottom-0 h-1 bg-black/60">
              <div className="h-full bg-emerald-400 transition-all duration-500" style={{ width: `${(f.hp / f.maxHp) * 100}%` }} />
            </div>
            {f.hp <= 0 && <Skull size={14} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white" />}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ItemIcon({ id, size = 'md' }: { id: ItemId; size?: 'md' | 'lg' }) {
  const it = ITEMS.find((x) => x.id === id)!;
  const Icon = id === 'potion' ? HeartPulse : id === 'elixir' ? Sword : id === 'tonic' ? Shield : Feather;
  const dim = size === 'lg' ? 'h-14 w-14' : 'h-11 w-11';
  return (
    <span className={`grid ${dim} shrink-0 place-items-center rounded-xl`} style={{ background: `radial-gradient(circle at 35% 30%, ${it.color}55, #0b0820 75%)`, boxShadow: `0 0 0 1.5px ${it.color}88, 0 0 18px -6px ${it.color}` }}>
      <Icon size={size === 'lg' ? 24 : 19} style={{ color: it.color }} />
    </span>
  );
}

function ActionBtn({ hotkey, icon, title, sub, onClick, disabled, tone, cooldown = 0 }: { hotkey: string; icon: ReactNode; title: string; sub: string; onClick: () => void; disabled?: boolean; tone: 'violet' | 'ember' | 'blue' | 'cyan' | 'green'; cooldown?: number }) {
  const colors = { violet: '#a78bfa', ember: '#fb923c', blue: '#60a5fa', cyan: '#22d3ee', green: '#34d399' };
  return (
    <button onClick={onClick} disabled={disabled} className={`act-btn act-${tone}`} style={{ ['--ac' as string]: colors[tone] }} title={`${title} � ${sub} (key ${hotkey})`}>
      <span className="act-glow" aria-hidden />
      {cooldown > 0 && <span className="act-cd" style={{ height: `${cooldown * 100}%` }} aria-hidden />}
      <span className="act-icon">{icon}</span>
      <span className="act-text">
        <b>{title}</b>
        <small>{sub}</small>
      </span>
      <kbd className="act-key">{hotkey}</kbd>
    </button>
  );
}
/* ———————————————————————————— RESULT ———————————————————————————— */

function Result({ summary, battle, onAgain, onTeam, onHome }: { summary: BattleSummary; battle: BattleState; onAgain: () => void; onTeam: () => void; onHome: () => void }) {
  const won = summary.outcome === 'won';
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-violet-400/15">
      <img src="/art/arena.webp" alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
      <div className={`absolute inset-0 ${won ? 'bg-gradient-to-b from-amber-500/10 via-night-950/80 to-night-950' : 'bg-gradient-to-b from-red-900/20 via-night-950/85 to-night-950'}`} />
      {won && (
        <>
          <motion.div className="pointer-events-none absolute left-1/2 top-[-300px] h-[900px] w-[900px] -translate-x-1/2 rounded-full opacity-50" style={{ background: 'conic-gradient(from 0deg, transparent, rgba(251,191,36,0.35), transparent 15%, transparent 35%, rgba(168,85,247,0.35), transparent 50%, transparent 70%, rgba(34,211,238,0.3), transparent 85%)' }} animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }} />
          <Particles count={40} color="#fbbf24" />
        </>
      )}
      <div className="relative flex flex-col items-center px-5 py-12 text-center sm:py-16">
        <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', damping: 10 }} className={`mb-4 grid h-20 w-20 place-items-center rounded-3xl ${won ? 'bg-gradient-to-br from-amber-300 to-orange-500 shadow-[0_0_60px_rgba(251,191,36,0.7)]' : 'bg-white/10'}`}>
          {won ? <Trophy size={38} className="text-night-950" /> : <Skull size={36} className="text-red-200" />}
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 20, letterSpacing: '0.4em' }} animate={{ opacity: 1, y: 0, letterSpacing: '0.06em' }} transition={{ delay: 0.15, duration: 0.6 }} className={`font-display text-6xl sm:text-7xl ${won ? 'text-gradient drop-shadow-[0_0_30px_rgba(251,191,36,0.5)]' : 'text-red-200/90'}`}>
          {won ? 'VICTORY' : 'DEFEAT'}
        </motion.h2>
        <p className="mt-2 text-violet-200/70">{won ? `You defeated ${battle.rival} in ${battle.round - 1} rounds.` : `${battle.rival} won this time. Train up and try again!`}</p>


        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-8 grid w-full max-w-3xl grid-cols-3 gap-3">
          <Reward label="Coins" value={<span className="inline-flex items-center gap-1.5"><CoinIcon size={20} />+{summary.coins}</span>} />
          <Reward label="Summoner XP" value={`+${summary.playerXp}`} />
          <Reward label="Team score" value={`${summary.teamScore}/100`} />
        </motion.div>

        {/* Per-monster performance report */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="mt-4 w-full max-w-3xl space-y-2 text-left">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300/80">Match performance</div>
          {summary.monsters.map((r, i) => {
            const f = battle.player.find((x) => x.uid === r.uid)!;
            const gm = r.grade ? GRADE_META[r.grade] : null;
            const dForm = r.formAfter - r.formBefore;
            return (
              <motion.div key={r.uid} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.65 + i * 0.12 }} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-night-950/60 p-3 backdrop-blur">
                <MonsterImg image={f.image} size="thumb" alt={f.name} className="h-14 w-12 shrink-0 rounded-xl" />
                <div
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl font-display text-3xl"
                  style={gm ? { color: gm.color, background: `${gm.color}1a`, boxShadow: `inset 0 0 0 1.5px ${gm.color}66, 0 0 20px -8px ${gm.color}` } : { color: '#94a3b8', background: 'rgba(255,255,255,0.05)' }}
                  title={gm ? `${gm.label} — score ${r.score}` : 'Did not fight'}
                >
                  {r.grade ?? '–'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2">
                    <span className="font-bold text-white">{r.name}</span>
                    <span className="text-xs text-violet-200/60">{r.played ? `${gm?.label} · score ${r.score}` : 'Stayed on the bench'}</span>
                  </div>
                  {r.played && (
                    <div className="mt-0.5 text-[11px] text-violet-200/60">
                      {r.damage} damage · {r.kos} KO{r.kos === 1 ? '' : 's'} · {r.survived ? 'survived' : 'fainted'}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 text-xs font-bold">
                  <span className="text-cyan-200">+{r.xp} XP</span>
                  {r.levelAfter > r.levelBefore ? (
                    <span className="rounded-full bg-violet-500/25 px-2 py-0.5 text-violet-100">
                      Lv {r.levelBefore} → {r.levelAfter}
                    </span>
                  ) : r.capped ? (
                    <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-amber-200">Level cap</span>
                  ) : null}
                  <span className={`inline-flex items-center gap-1 ${dForm > 0 ? 'text-emerald-300' : dForm < 0 ? 'text-red-300' : 'text-violet-200/50'}`}>
                    {dForm > 0 ? <TrendingUp size={12} /> : dForm < 0 ? <TrendingDown size={12} /> : null}
                    Form {r.formAfter > 0 ? '+' : ''}
                    {r.formAfter}
                    {dForm !== 0 && ` (${dForm > 0 ? '+' : ''}${dForm})`}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {(summary.playerLevelUp || summary.unlockable.length > 0 || summary.itemsUsed.length > 0) && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="mt-3 w-full max-w-3xl space-y-2 text-left">
            {summary.playerLevelUp && (
              <div className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 p-3 text-sm font-bold text-cyan-100">
                ⬆ Summoner reached level {summary.playerLevelUp}! +100 coins · monsters can now reach level {summary.playerLevelUp + 3}
              </div>
            )}
            {summary.unlockable.map((id) => {
              const s = getSpecies(id);
              return s ? (
                <div key={id} className="flex items-center gap-3 rounded-xl border border-amber-300/40 bg-amber-400/10 p-3">
                  <MonsterImg image={s.image} size="thumb" alt={s.name} className="h-14 w-12 rounded-lg" />
                  <div>
                    <div className="text-sm font-bold text-amber-100">{s.name} can now be unlocked in your Collection!</div>
                    <RarityBadge rarity={s.rarity} />
                  </div>
                </div>
              ) : null;
            })}
            {summary.itemsUsed.length > 0 && <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-violet-200/70">Items used: {summary.itemsUsed.map((i) => ITEMS.find((x) => x.id === i)?.name).join(', ')}</div>}
          </motion.div>
        )}
        {!won && <p className="mt-6 max-w-md text-sm text-violet-200/60">Tip: poor grades lower form (−2% stats per point). Lead with a type advantage, use items, and buy boosts in the Shop.</p>}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button className="btn btn-ghost" onClick={onHome}>
            <Home size={16} /> Home
          </button>
          <button className="btn btn-ghost" onClick={onTeam}>
            <Users size={16} /> Change team
          </button>
          <button className="btn btn-ember px-7 py-3.5" onClick={onAgain}>
            <Swords size={17} /> Battle again
          </button>
        </div>
      </div>
    </div>
  );
}

function Reward({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-night-950/60 p-4 backdrop-blur">
      <div className="text-[10px] font-bold uppercase tracking-wider text-violet-200/60">{label}</div>
      <div className="mt-1 font-display text-2xl text-white sm:text-3xl">{value}</div>
    </div>
  );
}
