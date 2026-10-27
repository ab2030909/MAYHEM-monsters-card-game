import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, CalendarCheck, Check, Flame, Gift, LayoutGrid, Lock, Sparkles, Swords, Target, Trophy } from 'lucide-react';
import type { Screen } from '../components/Layout';
import type { Monster } from '../game/types';
import { useGame } from '../state/GameContext';
import { DAILY_QUESTS, dailyRewardFor, dayDiff, playerXpToNext, todayKey } from '../game/progression';
import { getSpecies, SPECIES, UNLOCKS } from '../game/monsters';
import { RARITY_META } from '../game/elements';
import { LockedCard, MonsterCard } from '../components/MonsterCard';
import { MonsterDetail } from '../components/MonsterDetail';
import { ElementFX } from '../components/fx';
import { BrandLogo } from '../components/Brand';
import { CoinIcon, MonsterImg, Particles, ProgressBar, RarityBadge, SectionTitle } from '../components/ui';

export function HomeScreen({ go }: { go: (s: Screen) => void }) {
  const g = useGame();
  const p = g.player;
  const [detail, setDetail] = useState<Monster | null>(null);

  const ownedSpecies = new Set(p.monsters.map((m) => m.speciesId).filter(Boolean));
  const featured = useMemo(
    () => [...p.monsters].sort((a, b) => RARITY_META[b.rarity].rank - RARITY_META[a.rarity].rank || b.level - a.level).slice(0, 4),
    [p.monsters],
  );
  const nextLocked = UNLOCKS.filter((u) => !ownedSpecies.has(u.speciesId))
    .slice(0, 4)
    .map((rule) => ({ rule, s: getSpecies(rule.speciesId)! }));
  const recent = useMemo(() => [...p.monsters].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8), [p.monsters]);

  const today = todayKey();
  const nextStreak = p.daily.lastClaimDate && dayDiff(p.daily.lastClaimDate, today) === 1 ? p.daily.streak + 1 : p.daily.lastClaimDate === today ? p.daily.streak : 1;
  const reward = dailyRewardFor(Math.max(1, nextStreak));
  const need = playerXpToNext(p.level);

  return (
    <div className="mx-auto max-w-[1400px] space-y-12 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      {/* HERO */}
      <section className="relative isolate overflow-hidden rounded-[28px] border border-violet-400/15 shadow-[0_40px_120px_-40px_rgba(139,92,246,0.6)]">
        <img src="/art/hero.webp" alt="Aetherion, the cosmic griffin-dragon, on a floating island" className="hero-kenburns absolute inset-0 -z-20 h-full w-full object-cover object-[70%_center]" />
        <div className="hero-heat absolute inset-0 -z-10" aria-hidden />
        <div className="hero-flash absolute inset-0 -z-10" aria-hidden />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-night-950 via-night-950/80 to-transparent" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-night-950/90 via-transparent to-transparent" />
        <Particles count={22} />
        <div className="hero-sparks" aria-hidden><ElementFX element="fire" count={46} /></div>
        <div className="hero-slashes" aria-hidden><i /><i /><i /></div>
        <div className="hero-fight font-display" aria-hidden><span>READY</span><span>FIGHT!</span></div>
        <div className="relative flex min-h-[460px] flex-col justify-center px-6 py-12 sm:px-12 lg:min-h-[520px] lg:max-w-[60%]">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
            <Sparkles size={13} /> Season of the Aether
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="leading-none">
            <BrandLogo size="lg" />
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }} className="mt-4 max-w-md text-lg text-violet-100/85 sm:text-xl">
            Create your legend. Collect the extraordinary. Turn any image into a monster — then take it to the arena.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }} className="mt-8 flex flex-wrap gap-3">
            <button className="btn btn-ember btn-fight px-6 py-3.5 text-base" onClick={() => go('battle')}>
              <Swords size={19} /> Enter the Arena
            </button>
            <button className="btn btn-ghost px-6 py-3.5 text-base backdrop-blur" onClick={() => go('create')}>
              <Sparkles size={18} /> Create Your Monster
            </button>
            <button className="btn btn-ghost px-5 py-3.5 text-base backdrop-blur" onClick={() => go('guide')}>
              <BookOpen size={18} /> How to Play
            </button>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-10 grid max-w-xl grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/10 bg-night-950/50 p-3 backdrop-blur-md">
              <div className="text-[10px] font-bold uppercase tracking-wider text-violet-200/60">Summoner Lv</div>
              <div className="font-display text-2xl text-white">{p.level}</div>
              <ProgressBar value={p.xp} max={need} height={4} className="mt-1.5" />
            </div>
            <div className="rounded-2xl border border-white/10 bg-night-950/50 p-3 backdrop-blur-md">
              <div className="text-[10px] font-bold uppercase tracking-wider text-violet-200/60">Bestiary</div>
              <div className="font-display text-2xl text-white">
                {ownedSpecies.size}
                <span className="text-base text-violet-200/50">/{SPECIES.length}</span>
              </div>
              <ProgressBar value={ownedSpecies.size} max={SPECIES.length} height={4} className="mt-1.5" color="linear-gradient(90deg,#fbbf24,#fb923c)" />
            </div>
            <div className="rounded-2xl border border-white/10 bg-night-950/50 p-3 backdrop-blur-md">
              <div className="text-[10px] font-bold uppercase tracking-wider text-violet-200/60">Victories</div>
              <div className="font-display text-2xl text-white">{p.stats.wins}</div>
              <div className="mt-1 text-[10px] text-violet-200/50">{p.stats.winStreak > 0 ? `${p.stats.winStreak} win streak 🔥` : 'Start a streak'}</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* DAILY */}
      <section>
        <SectionTitle eyebrow="Today" title="Daily Rewards & Quests" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          <div className="panel relative overflow-hidden p-5">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl" />
            <div className="relative flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 text-night-950 shadow-[0_0_30px_rgba(251,146,60,0.5)]">
                <Gift size={22} />
              </div>
              <div>
                <div className="font-display text-lg text-white">Daily Chest</div>
                <div className="text-xs text-violet-200/60">Day {reward.day} of 7 · streak {p.daily.streak}</div>
              </div>
            </div>
            <div className="relative mt-4 flex gap-1">
              {Array.from({ length: 7 }, (_, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full ${i < (g.dailyAvailable ? reward.day - 1 : reward.day) ? 'bg-orange-400' : 'bg-white/10'}`} />
              ))}
            </div>
            <div className="relative mt-4 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-200">
                <CoinIcon /> {reward.coins} <span className="text-violet-200/50">+ {reward.xp} XP</span>
              </span>
              <button className="btn btn-ember !px-4 !py-2 text-sm" disabled={!g.dailyAvailable} onClick={g.claimDaily}>
                {g.dailyAvailable ? 'Claim' : (
                  <>
                    <Check size={15} /> Claimed
                  </>
                )}
              </button>
            </div>
          </div>

          {DAILY_QUESTS.map((q) => {
            const prog = p.daily.questProgress[q.id] ?? 0;
            const done = prog >= q.target;
            const claimed = p.daily.questClaimed.includes(q.id);
            const Icon = q.metric === 'wins' ? Trophy : q.metric === 'creates' ? Sparkles : Flame;
            return (
              <div key={q.id} className="panel flex flex-col p-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl border border-violet-400/25 bg-violet-500/15 text-violet-200">
                    <Icon size={19} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-bold text-white">{q.title}</div>
                    <div className="inline-flex items-center gap-1 text-xs text-amber-200/90">
                      <CoinIcon size={12} /> {q.reward.coins} · {q.reward.xp} XP
                    </div>
                  </div>
                </div>
                <div className="mt-auto pt-4">
                  <div className="mb-1.5 flex justify-between text-xs text-violet-200/60">
                    <span className="inline-flex items-center gap-1">
                      <Target size={12} /> Progress
                    </span>
                    <span className="font-bold text-white">
                      {prog}/{q.target}
                    </span>
                  </div>
                  <ProgressBar value={prog} max={q.target} height={6} />
                  <button
                    className={`btn mt-3 w-full !py-2 text-sm ${done && !claimed ? 'btn-primary' : 'btn-ghost'}`}
                    disabled={!done || claimed}
                    onClick={() => (done ? g.claimQuest(q.id) : null)}
                  >
                    {claimed ? (
                      <>
                        <Check size={15} /> Completed
                      </>
                    ) : done ? (
                      'Claim reward'
                    ) : (
                      'In progress'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FEATURED */}
      <section>
        <SectionTitle
          eyebrow="Your strongest"
          title="Featured Monsters"
          action={
            <button className="btn btn-ghost !py-2 text-sm" onClick={() => go('collection')}>
              <LayoutGrid size={15} /> View all
            </button>
          }
        />
        <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4">
          {featured.map((m, i) => (
            <motion.div key={m.uid} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}>
              <MonsterCard monster={m} onClick={() => setDetail(m)} eager />
            </motion.div>
          ))}
        </div>
      </section>

      {/* LOCKED */}
      {nextLocked.length > 0 && (
        <section>
          <SectionTitle
            eyebrow="Level up to unlock"
            title="Locked Monsters"
            action={
              <button className="btn btn-ghost !py-2 text-sm" onClick={() => go('collection')}>
                <Lock size={15} /> All locked
              </button>
            }
          />
          <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4">
            {nextLocked.map(({ s, rule }) => (
              <LockedCard key={s.id} species={s} rule={rule} level={p.level} coins={p.coins} onUnlock={() => g.unlockSpecies(s.id)} />
            ))}
          </div>
        </section>
      )}

      {/* RECENT */}
      <section>
        <SectionTitle eyebrow="Latest arrivals" title="Recently Discovered" />
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
          {recent.map((m) => (
            <button key={m.uid} onClick={() => setDetail(m)} className="group relative w-[170px] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10 bg-night-800 text-left transition hover:-translate-y-1 hover:border-violet-400/40">
              <MonsterImg image={m.image} size="thumb" alt={m.name} className="aspect-[3/4] w-full" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-night-950 via-night-950/80 to-transparent p-3 pt-10">
                <div className="truncate font-display text-base text-white">{m.name}</div>
                <div className="mt-1 flex items-center justify-between">
                  <RarityBadge rarity={m.rarity} />
                  <span className="text-[10px] text-violet-200/60">Lv {m.level}</span>
                </div>
              </div>
            </button>
          ))}
          <button onClick={() => go('create')} className="grid w-[170px] shrink-0 snap-start place-items-center rounded-2xl border-2 border-dashed border-violet-400/25 bg-violet-500/5 p-4 text-center text-violet-200/70 transition hover:border-violet-400/60 hover:text-white">
            <div>
              <Sparkles className="mx-auto mb-2" />
              <div className="text-sm font-bold">Create a new monster</div>
              <div className="mt-1 inline-flex items-center gap-1 text-xs text-cyan-300">
                Open studio <ArrowRight size={12} />
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* CTA */}
      <section className="panel relative overflow-hidden p-6 sm:p-8">
        <div className="absolute inset-0 bg-[url('/art/arena.webp')] bg-cover bg-center opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-r from-night-900 via-night-900/80 to-transparent" />
        <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-orange-300">
              <CalendarCheck size={14} /> The arena awaits
            </div>
            <h3 className="mt-1 font-display text-3xl text-white">Assemble a team of three and battle a rival</h3>
            <p className="mt-1 text-sm text-violet-200/70">Win coins and XP — raise your Summoner level to unlock legendary monsters like Magmaw, Elderwood & Abyssor.</p>
          </div>
          <button className="btn btn-primary px-6 py-3" onClick={() => go('battle')}>
            <Swords size={18} /> Battle now
          </button>
        </div>
      </section>

      <MonsterDetail monster={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
