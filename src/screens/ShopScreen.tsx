import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronsUp, FlaskConical, Gauge, HeartPulse, Lock, Search, Shield, Sparkles, Sword, Swords, Zap } from 'lucide-react';
import type { Screen } from '../components/Layout';
import type { Monster } from '../game/types';
import { ELEMENT_META } from '../game/elements';
import { monsterStats, monsterXpToNext, power } from '../game/stats';
import { BOOST_MAX_RANK, BOOST_PCT, boostCost, boostRankCap, ITEMS, ITEMS_PER_BATTLE, skillsFor, STAT_LABEL, type StatKey } from '../game/rules';
import { useGame } from '../state/GameContext';
import { MonsterCard } from '../components/MonsterCard';
import { CoinIcon, ElementIcon, MonsterImg, ProgressBar } from '../components/ui';
import { ItemIcon } from './BattleScreen';

const STAT_ICON: Record<StatKey, typeof Sword> = { hp: HeartPulse, attack: Sword, defense: Shield, speed: Gauge };
const STAT_COLOR: Record<StatKey, string> = { hp: '#4ade80', attack: '#fb923c', defense: '#38bdf8', speed: '#facc15' };
const EFFECT_LABEL = { burn: 'Burn', heal: 'Heal', shield: 'Shield', stun: 'Stun', drain: 'Drain', pierce: 'Pierce' };

export function ShopScreen({ go, param }: { go: (s: Screen) => void; param?: string }) {
  const g = useGame();
  const p = g.player;
  const [tab, setTab] = useState<'upgrades' | 'items'>('upgrades');
  const [sel, setSel] = useState<string>(() => param || p.team[0] || p.monsters[0]?.uid);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (param) {
      setSel(param);
      setTab('upgrades');
    }
  }, [param]);

  const list = useMemo(() => p.monsters.filter((m) => m.name.toLowerCase().includes(q.trim().toLowerCase())).sort((a, b) => Number(p.team.includes(b.uid)) - Number(p.team.includes(a.uid)) || b.level - a.level), [p.monsters, p.team, q]);
  const m = p.monsters.find((x) => x.uid === sel) ?? p.monsters[0];

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300/90">Merchant of the Arena</div>
          <h1 className="font-display text-4xl tracking-wide text-white sm:text-5xl">Shop</h1>
          <p className="mt-1 text-violet-200/70">Spend coins on permanent stat boosts, new special skills and battle items.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/25 bg-amber-400/10 px-4 py-2.5 font-display text-xl text-amber-100">
            <CoinIcon size={20} /> {p.coins.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="mb-6 inline-flex rounded-2xl border border-white/10 bg-white/[0.03] p-1">
        {(
          [
            ['upgrades', 'Monster upgrades', ChevronsUp],
            ['items', 'Battle items', FlaskConical],
          ] as const
        ).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)} className={`relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${tab === id ? 'text-white' : 'text-violet-200/60 hover:text-white'}`}>
            {tab === id && <motion.span layoutId="shop-tab" className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-600/60 to-blue-600/40" />}
            <Icon size={16} className="relative" />
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      {tab === 'items' ? (
        <ItemsTab go={go} />
      ) : m ? (
        <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
          {/* Picker */}
          <aside className="panel flex max-h-[calc(100vh-140px)] flex-col p-3 xl:sticky xl:top-6">
            <label className="relative mb-2 block">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-300/60" />
              <input className="input !py-2 !pl-9 text-sm" placeholder="Find a monster…" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 xl:flex-col xl:overflow-y-auto xl:overflow-x-visible">
              {list.map((x) => (
                <button key={x.uid} onClick={() => setSel(x.uid)} className={`flex shrink-0 items-center gap-2.5 rounded-xl border p-1.5 pr-3 text-left transition ${x.uid === m.uid ? 'border-violet-400/60 bg-violet-500/15' : 'border-transparent hover:bg-white/5'}`}>
                  <MonsterImg image={x.image} size="thumb" alt={x.name} className="h-11 w-9 rounded-lg" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 truncate text-sm font-bold text-white">
                      {x.name} {p.team.includes(x.uid) && <span className="rounded bg-cyan-400/20 px-1 text-[9px] text-cyan-200">TEAM</span>}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-violet-200/60">
                      <ElementIcon element={x.element} size={10} /> Lv {x.level}
                      {(x.form ?? 0) !== 0 && <span className={(x.form ?? 0) > 0 ? 'text-emerald-300' : 'text-red-300'}>· form {(x.form ?? 0) > 0 ? '+' : ''}{x.form}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <Upgrades m={m} go={go} />
        </div>
      ) : null}
    </div>
  );
}

function Upgrades({ m, go }: { m: Monster; go: (s: Screen) => void }) {
  const g = useGame();
  const p = g.player;
  const s = monsterStats(m);
  const rankCap = boostRankCap(m.level);
  const skills = skillsFor(m);
  const el = ELEMENT_META[m.element];
  const capped = m.level >= g.levelCap;

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-4">
        <div className="mx-auto w-full max-w-[300px]">
          <MonsterCard monster={m} size="lg" eager />
        </div>
        <div className="panel p-4 text-sm">
          <div className="mb-2 flex justify-between">
            <span className="font-bold text-white">Level {m.level}</span>
            <span className="text-violet-200/60">
              {m.xp}/{monsterXpToNext(m.level)} XP · Power <b className="text-white">{power(m)}</b>
            </span>
          </div>
          <ProgressBar value={m.xp} max={monsterXpToNext(m.level)} height={6} />
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-lg bg-black/25 p-2">
              <div className="text-violet-200/60">Level cap</div>
              <div className={`font-bold ${capped ? 'text-amber-200' : 'text-white'}`}>
                Lv {g.levelCap} {capped && '· reached'}
              </div>
            </div>
            <div className="rounded-lg bg-black/25 p-2">
              <div className="text-violet-200/60">Form</div>
              <div className={`font-bold ${(m.form ?? 0) > 0 ? 'text-emerald-300' : (m.form ?? 0) < 0 ? 'text-red-300' : 'text-white'}`}>
                {(m.form ?? 0) > 0 ? '+' : ''}
                {m.form ?? 0} ({(m.form ?? 0) * 2}% stats)
              </div>
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-violet-200/60">Levels come only from battle XP. Boost ranks are limited by level (rank N needs level N). Form changes with match grades.</p>
          <button className="btn btn-ember mt-3 w-full !py-2 text-sm" onClick={() => go('battle')}>
            <Swords size={15} /> Battle to earn XP
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Boosts */}
        <section className="panel p-5">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl text-white">Stat boosts</h2>
              <p className="text-xs text-violet-200/60">
                Permanent. Each rank adds +{BOOST_PCT}% to that stat. Max {BOOST_MAX_RANK} ranks · currently unlocked up to rank {rankCap}.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(['hp', 'attack', 'defense', 'speed'] as StatKey[]).map((k) => {
              const Icon = STAT_ICON[k];
              const rank = m.boosts[k];
              const maxed = rank >= BOOST_MAX_RANK;
              const lockedByLevel = !maxed && rank >= rankCap;
              const cost = boostCost(rank);
              const next = monsterStats({ ...m, boosts: { ...m.boosts, [k]: rank + 1 } })[k];
              return (
                <div key={k} className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${STAT_COLOR[k]}1f`, color: STAT_COLOR[k] }}>
                      <Icon size={19} />
                    </span>
                    <div className="flex-1">
                      <div className="font-bold text-white">{STAT_LABEL[k]}</div>
                      <div className="text-xs text-violet-200/60">
                        {s[k]} {!maxed && <span className="text-emerald-300">→ {next}</span>}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-violet-200/70">
                      Rank {rank}/{BOOST_MAX_RANK}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-1">
                    {Array.from({ length: BOOST_MAX_RANK }, (_, i) => (
                      <span key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i < rank ? STAT_COLOR[k] : i < rankCap ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.04)', boxShadow: i < rank ? `0 0 6px ${STAT_COLOR[k]}` : undefined }} />
                    ))}
                  </div>
                  <button className={`btn mt-3 w-full !py-2 text-sm ${!maxed && !lockedByLevel && p.coins >= cost ? 'btn-primary' : 'btn-ghost'}`} disabled={maxed || lockedByLevel || p.coins < cost} onClick={() => g.buyBoost(m.uid, k)}>
                    {maxed ? (
                      <>
                        <Check size={15} /> Maxed
                      </>
                    ) : lockedByLevel ? (
                      <>
                        <Lock size={14} /> Needs monster Lv {rank + 1}
                      </>
                    ) : (
                      <>
                        <ChevronsUp size={15} /> Boost · <CoinIcon size={13} /> {cost}
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Skills */}
        <section className="panel p-5">
          <h2 className="font-display text-2xl text-white">Special skills</h2>
          <p className="mb-4 text-xs text-violet-200/60">Learn new specials with coins. Each skill needs a minimum monster level. One special is equipped at a time — switch freely between learned skills.</p>
          <div className="grid gap-3 md:grid-cols-2">
            {/* Innate */}
            <SkillCard
              name={m.ability.name}
              desc={m.ability.description}
              meta={`PWR ${m.ability.power} · ${EFFECT_LABEL[m.ability.effect]} · CD ${m.ability.cooldown}`}
              badge="Innate"
              color={el.color}
              state={m.equippedSkill === null ? 'equipped' : 'owned'}
              onEquip={() => g.equipSkill(m.uid, null)}
            />
            {skills.map((sk) => {
              const owned = m.skills.includes(sk.id);
              const state = owned ? (m.equippedSkill === sk.id ? 'equipped' : 'owned') : m.level < sk.level ? 'locked' : 'buy';
              return (
                <SkillCard
                  key={sk.id}
                  name={sk.name}
                  desc={sk.description}
                  meta={`PWR ${sk.power} · ${EFFECT_LABEL[sk.effect]} · CD ${sk.cooldown}`}
                  badge={sk.element ? (sk.id.endsWith('_ult') ? 'Ultimate' : ELEMENT_META[sk.element].label) : 'Universal'}
                  color={sk.element ? ELEMENT_META[sk.element].color : '#c4b5fd'}
                  state={state}
                  level={sk.level}
                  cost={sk.cost}
                  canAfford={p.coins >= sk.cost}
                  onBuy={() => g.learnSkill(m.uid, sk.id)}
                  onEquip={() => g.equipSkill(m.uid, sk.id)}
                />
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function SkillCard(props: {
  name: string;
  desc: string;
  meta: string;
  badge: string;
  color: string;
  state: 'equipped' | 'owned' | 'buy' | 'locked';
  level?: number;
  cost?: number;
  canAfford?: boolean;
  onBuy?: () => void;
  onEquip?: () => void;
}) {
  const { state } = props;
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-4 transition ${state === 'equipped' ? 'border-amber-300/60 bg-amber-400/[0.07]' : state === 'locked' ? 'border-white/[0.06] bg-black/20 opacity-70' : 'border-white/[0.08] bg-black/20'}`}>
      <div className="absolute inset-y-0 left-0 w-1" style={{ background: props.color, boxShadow: `0 0 12px ${props.color}` }} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Zap size={15} style={{ color: props.color }} />
            <span className="font-bold text-white">{props.name}</span>
          </div>
          <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: props.color }}>
            {props.badge} · <span className="text-violet-200/60">{props.meta}</span>
          </div>
        </div>
        {props.level !== undefined && <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-extrabold ${state === 'locked' ? 'bg-red-500/15 text-red-200' : 'bg-white/5 text-violet-100'}`}>Lv {props.level}+</span>}
      </div>
      <p className="mt-2 text-xs text-violet-100/75">{props.desc}</p>
      <div className="mt-3">
        {state === 'equipped' ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-200">
            <Sparkles size={13} /> Equipped
          </span>
        ) : state === 'owned' ? (
          <button className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={props.onEquip}>
            <Check size={13} /> Equip
          </button>
        ) : state === 'locked' ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-200/60">
            <Lock size={13} /> Reach level {props.level} · <CoinIcon size={12} /> {props.cost}
          </span>
        ) : (
          <button className={`btn !px-3 !py-1.5 text-xs ${props.canAfford ? 'btn-ember' : 'btn-ghost'}`} disabled={!props.canAfford} onClick={props.onBuy}>
            <CoinIcon size={12} /> Learn · {props.cost}
          </button>
        )}
      </div>
    </div>
  );
}

function ItemsTab({ go }: { go: (s: Screen) => void }) {
  const g = useGame();
  const p = g.player;
  return (
    <div>
      <div className="panel mb-5 flex flex-wrap items-center justify-between gap-3 p-4 text-sm text-violet-100/80">
        <span>
          Items are used during battle from the <b className="text-white">Items</b> action. They go first in the turn, use your move, and you can use up to <b className="text-white">{ITEMS_PER_BATTLE}</b> per battle. Items are only consumed when used.
        </span>
        <button className="btn btn-ghost !py-2 text-sm" onClick={() => go('battle')}>
          <Swords size={15} /> To the arena
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {ITEMS.map((it, i) => (
          <motion.div key={it.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="panel relative flex flex-col overflow-hidden p-5">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl" style={{ background: `${it.color}33` }} />
            <div className="relative flex items-center justify-between">
              <ItemIcon id={it.id} size="lg" />
              <span className="rounded-xl bg-black/30 px-3 py-1 text-sm font-bold text-white">Owned ×{p.inventory[it.id] ?? 0}</span>
            </div>
            <div className="relative mt-4 font-display text-xl text-white">{it.name}</div>
            <p className="relative mt-1 flex-1 text-sm text-violet-200/70">{it.description}</p>
            <div className="relative mt-4 flex gap-2">
              <button className="btn btn-ember flex-1 !py-2 text-sm" disabled={p.coins < it.cost} onClick={() => g.buyItem(it.id, 1)}>
                <CoinIcon size={13} /> {it.cost}
              </button>
              <button className="btn btn-ghost !py-2 text-sm" disabled={p.coins < it.cost * 5} onClick={() => g.buyItem(it.id, 5)}>
                ×5 · {it.cost * 5}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
