import { useState } from 'react';
import { motion } from 'framer-motion';
import { Award, Check, Cloud, CloudOff, Crown, Flame, Gem, Lock, Pencil, RotateCcw, Sparkles, Swords, Target, Trophy, Zap } from 'lucide-react';
import type { Screen } from '../components/Layout';
import { useGame } from '../state/GameContext';
import { ACHIEVEMENTS, MILESTONES, playerXpToNext } from '../game/progression';
import { ELEMENTS, ELEMENT_META, RARITIES, RARITY_META } from '../game/elements';
import { SPECIES } from '../game/monsters';
import { cloudinaryConfigured, cloudName } from '../services/cloudinary';
import { CoinIcon, ElementIcon, Modal, ProgressBar, SectionTitle } from '../components/ui';
import { LevelRoad } from '../components/LevelRoad';

const ACH_ICON: Record<string, typeof Trophy> = {
  first_win: Swords, creator: Sparkles, streak3: Flame, veteran10: Trophy, lvl10: Zap, champion: Crown, bestiary: Gem, hoarder: Award,
};

export function ProfileScreen({ go }: { go: (s: Screen) => void }) {
  const g = useGame();
  const p = g.player;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(p.name);
  const [confirmReset, setConfirmReset] = useState(false);
  const need = playerXpToNext(p.level);
  const owned = new Set(p.monsters.map((m) => m.speciesId).filter((x): x is string => !!x));
  const winRate = p.stats.battles ? Math.round((p.stats.wins / p.stats.battles) * 100) : 0;

  const stats = [
    { label: 'Battles', value: p.stats.battles, icon: Swords },
    { label: 'Victories', value: p.stats.wins, icon: Trophy },
    { label: 'Win rate', value: `${winRate}%`, icon: Target },
    { label: 'Best streak', value: p.stats.bestStreak, icon: Flame },
    { label: 'Created', value: p.stats.created, icon: Sparkles },
    { label: 'Specials used', value: p.stats.specialsUsed, icon: Zap },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-10 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      {/* Player card */}
      <section className="panel relative overflow-hidden p-6 sm:p-8">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-violet-600/25 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
          <div className="relative mx-auto md:mx-0">
            <svg width="132" height="132" viewBox="0 0 132 132" className="-rotate-90">
              <circle cx="66" cy="66" r="58" stroke="rgba(255,255,255,0.08)" strokeWidth="8" fill="none" />
              <motion.circle cx="66" cy="66" r="58" stroke="url(#lvG)" strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={2 * Math.PI * 58} initial={{ strokeDashoffset: 2 * Math.PI * 58 }} animate={{ strokeDashoffset: 2 * Math.PI * 58 * (1 - p.xp / need) }} transition={{ duration: 1 }} />
              <defs>
                <linearGradient id="lvG" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#8b5cf6" />
                  <stop offset="1" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-violet-200/60">Level</div>
                <div className="font-display text-5xl leading-none text-white">{p.level}</div>
              </div>
            </div>
          </div>
          <div className="flex-1 text-center md:text-left">
            {editing ? (
              <form
                className="flex justify-center gap-2 md:justify-start"
                onSubmit={(e) => {
                  e.preventDefault();
                  g.rename(name);
                  setEditing(false);
                }}
              >
                <input className="input max-w-xs" value={name} maxLength={20} autoFocus onChange={(e) => setName(e.target.value)} aria-label="Summoner name" />
                <button className="btn btn-primary" type="submit">
                  <Check size={16} /> Save
                </button>
              </form>
            ) : (
              <h1 className="flex items-center justify-center gap-3 font-display text-4xl text-white md:justify-start">
                {p.name}
                <button className="rounded-lg p-1.5 text-violet-200/60 hover:bg-white/5 hover:text-white" onClick={() => setEditing(true)} aria-label="Edit name">
                  <Pencil size={16} />
                </button>
              </h1>
            )}
            <p className="mt-1 text-violet-200/70">
              {p.xp} / {need} XP to level {p.level + 1} · each level grants <span className="text-amber-200">100 coins</span>
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3 md:justify-start">
              <span className="inline-flex items-center gap-2 rounded-xl bg-black/25 px-4 py-2 font-bold text-amber-200">
                <CoinIcon size={18} /> {p.coins.toLocaleString()} coins
              </span>
              <span className="inline-flex items-center gap-2 rounded-xl bg-black/25 px-4 py-2 font-bold text-white">
                {p.monsters.length} monsters · {owned.size}/{SPECIES.length} species
              </span>
              <span className="inline-flex items-center gap-2 rounded-xl bg-black/25 px-4 py-2 font-bold text-violet-100">
                <Award size={16} className="text-violet-300" /> {p.achievements.length}/{ACHIEVEMENTS.length} badges
              </span>
            </div>
          </div>
        </div>
        <div className="relative mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl bg-black/25 p-4">
              <s.icon size={16} className="text-cyan-300" />
              <div className="mt-2 font-display text-2xl text-white">{s.value}</div>
              <div className="text-[11px] font-semibold text-violet-200/60">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Level road */}
      <section>
        <SectionTitle eyebrow="Level system" title="Summoner Road" />
        <LevelRoad level={p.level} xp={p.xp} unlocked={owned} onBattle={() => go('battle')} />
      </section>

      {/* Achievements */}
      <section>
        <SectionTitle eyebrow="Badges" title="Achievements" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {ACHIEVEMENTS.map((a, i) => {
            const got = p.achievements.includes(a.id);
            const Icon = ACH_ICON[a.id] ?? Award;
            return (
              <motion.div key={a.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }} className={`panel relative overflow-hidden p-5 ${got ? '' : 'opacity-60'}`}>
                {got && <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-amber-400/20 blur-2xl" />}
                <div className={`relative grid h-14 w-14 place-items-center rounded-2xl ${got ? 'bg-gradient-to-br from-amber-300 via-orange-400 to-fuchsia-500 text-night-950 shadow-[0_0_30px_rgba(251,191,36,0.45)]' : 'border border-white/10 bg-white/5 text-violet-200/50'}`}>
                  {got ? <Icon size={24} /> : <Lock size={20} />}
                </div>
                <div className="relative mt-3 font-bold text-white">{a.name}</div>
                <div className="relative text-xs text-violet-200/60">{a.description}</div>
                <div className="relative mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-amber-200/90">
                  {got ? <Check size={12} /> : <CoinIcon size={12} />} {got ? 'Earned' : `+${a.reward}`}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Milestones */}
        <section className="panel p-6">
          <h3 className="mb-4 font-display text-2xl text-white">Collection milestones</h3>
          <div className="space-y-3">
            {MILESTONES.map((m) => {
              const claimed = p.claimedMilestones.includes(m.count);
              const ready = p.monsters.length >= m.count;
              return (
                <div key={m.count} className="flex items-center gap-4 rounded-2xl bg-black/20 p-3">
                  <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl font-display ${claimed ? 'bg-emerald-400/20 text-emerald-300' : ready ? 'bg-amber-400/20 text-amber-300' : 'bg-white/5 text-violet-200/60'}`}>{m.count}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-bold text-white">Own {m.label}</span>
                      <span className="inline-flex items-center gap-1 text-amber-200">
                        <CoinIcon size={12} /> {m.coins}
                      </span>
                    </div>
                    <ProgressBar value={Math.min(p.monsters.length, m.count)} max={m.count} height={5} className="mt-1.5" />
                  </div>
                  {claimed ? (
                    <Check className="text-emerald-300" />
                  ) : (
                    <button className="btn btn-ember !px-3 !py-1.5 text-xs" disabled={!ready} onClick={() => g.claimMilestone(m.count)}>
                      Claim
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <button className="btn btn-ghost mt-4 w-full" onClick={() => go('create')}>
            <Sparkles size={16} /> Create monsters to progress
          </button>
        </section>

        {/* Breakdown */}
        <section className="panel p-6">
          <h3 className="mb-4 font-display text-2xl text-white">Collection breakdown</h3>
          <div className="space-y-2.5">
            {ELEMENTS.map((e) => {
              const n = p.monsters.filter((m) => m.element === e).length;
              return (
                <div key={e} className="flex items-center gap-3">
                  <span className="flex w-24 items-center gap-1.5 text-sm font-semibold text-white">
                    <ElementIcon element={e} /> {ELEMENT_META[e].label}
                  </span>
                  <ProgressBar value={n} max={Math.max(1, p.monsters.length)} height={8} className="flex-1" color={ELEMENT_META[e].color} />
                  <span className="w-6 text-right text-sm font-bold tabular-nums text-white">{n}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-5 grid grid-cols-4 gap-2">
            {RARITIES.map((r) => (
              <div key={r} className="rounded-xl bg-black/25 p-3 text-center">
                <div className="font-display text-2xl text-white">{p.monsters.filter((m) => m.rarity === r).length}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: RARITY_META[r].color }}>
                  {RARITY_META[r].label}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Settings */}
      <section className="panel flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${cloudinaryConfigured ? 'bg-cyan-400/15 text-cyan-300' : 'bg-amber-400/15 text-amber-300'}`}>{cloudinaryConfigured ? <Cloud size={20} /> : <CloudOff size={20} />}</div>
          <div>
            <div className="font-bold text-white">{cloudinaryConfigured ? `Cloudinary connected · ${cloudName}` : 'Cloudinary not configured'}</div>
            <div className="text-sm text-violet-200/60">
              {cloudinaryConfigured ? `${p.uploads.length} image${p.uploads.length === 1 ? '' : 's'} uploaded. Artwork is delivered with f_auto, q_auto and smart cropping.` : 'Uploaded art is stored on this device. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in .env.local.'}
            </div>
          </div>
        </div>
        <button className="btn btn-ghost !text-red-200" onClick={() => setConfirmReset(true)}>
          <RotateCcw size={16} /> Reset progress
        </button>
      </section>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} label="Reset progress">
        <div className="p-6">
          <h3 className="font-display text-2xl text-white">Reset all progress?</h3>
          <p className="mt-1 text-sm text-violet-200/70">Your level, coins, created monsters and achievements will be erased. Images already uploaded to Cloudinary stay in your Cloudinary account.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn btn-ghost" onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
            <button
              className="btn !bg-red-500/80 text-white"
              onClick={() => {
                g.resetProgress();
                setConfirmReset(false);
                setName('Summoner');
              }}
            >
              <RotateCcw size={15} /> Reset
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
