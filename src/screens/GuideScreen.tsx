import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import {
  ArrowLeftRight, ArrowRight, BookOpen, ChevronsUp, Coins, Crown, Flame, FlaskConical, Gift, HeartPulse, LayoutGrid, Lock, Shield, ShieldHalf, ShoppingBag, Sparkles, Star, Sword, Swords, Target, Trophy, Users, Zap,
} from 'lucide-react';
import type { Screen } from '../components/Layout';
import type { Element, Monster } from '../game/types';
import { ELEMENTS, ELEMENT_META, RARITIES, RARITY_META, STRONG_AGAINST } from '../game/elements';
import { getSpecies, SPECIES, UNLOCKS } from '../game/monsters';
import { speciesToMonster } from '../game/stats';
import {
  BOOST_MAX_RANK, BOOST_PCT, BUFF_PCT, FORM_STEP_PCT, GRADE_META, ITEMS, ITEMS_PER_BATTLE, LEVEL_CAP_OVER_SUMMONER, MAX_MONSTER_LEVEL, SUMMONER_LEVEL_COINS,
} from '../game/rules';
import { MonsterCard } from '../components/MonsterCard';
import { ElementIcon, MonsterImg } from '../components/ui';
import { ItemIcon } from './BattleScreen';

const SECTIONS = [
  ['loop', 'Game loop'],
  ['cards', 'Cards'],
  ['elements', 'Elements'],
  ['battle', 'Battle'],
  ['performance', 'Performance'],
  ['levels', 'Levels'],
  ['shop', 'Shop'],
  ['rewards', 'Rewards'],
] as const;

export function GuideScreen({ go }: { go: (s: Screen) => void }) {
  const sample: Monster = { ...speciesToMonster(getSpecies('emberclaw')!, 6), form: 2, boosts: { hp: 1, attack: 3, defense: 0, speed: 1 }, xp: 140 };

  return (
    <div className="mx-auto max-w-[1200px] space-y-16 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      {/* Header */}
      <header className="panel relative overflow-hidden p-6 sm:p-10">
        <img src="/art/arena.webp" alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-r from-night-900 via-night-900/80 to-transparent" />
        <div className="relative">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
            <BookOpen size={13} /> Summoner’s handbook
          </div>
          <h1 className="font-display text-5xl text-white sm:text-6xl">How to Play</h1>
          <p className="mt-2 max-w-xl text-violet-100/80">Everything you need to master MAYHEM — from reading a card to earning an S grade in the arena.</p>
          <nav className="mt-6 flex flex-wrap gap-2">
            {SECTIONS.map(([id, label]) => (
              <a key={id} href={`#/guide`} onClick={(e) => { e.preventDefault(); document.getElementById(`g-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className="chip !px-3 !py-1.5 hover:text-white">
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* 1. LOOP */}
      <Section id="loop" n={1} title="The game loop" sub="Every session follows the same rhythm.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          {[
            [LayoutGrid, 'Collect', 'Start with 12 monsters. Unlock more with level + coins.', '#a78bfa'],
            [Sparkles, 'Create', 'Turn any image into your own original monster.', '#22d3ee'],
            [Users, 'Build a team', 'Pick 3. The first one leads.', '#38bdf8'],
            [Swords, 'Battle', 'Turn-based fights against a rival.', '#fb923c'],
            [Star, 'Get graded', 'S–D grades change XP and form.', '#fbbf24'],
            [ChevronsUp, 'Grow', 'Level up, buy boosts & skills, unlock.', '#4ade80'],
          ].map(([Icon, t, d, c], i, arr) => {
            const I = Icon as typeof Swords;
            return (
              <motion.div key={t as string} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} className="relative">
                <div className="panel h-full p-4 text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl" style={{ background: `${c}22`, color: c as string, boxShadow: `0 0 24px -8px ${c}` }}>
                    <I size={22} />
                  </div>
                  <div className="mt-1 text-[10px] font-extrabold text-violet-200/40">STEP {i + 1}</div>
                  <div className="font-bold text-white">{t as string}</div>
                  <div className="mt-1 text-[11px] leading-snug text-violet-200/65">{d as string}</div>
                </div>
                {i < arr.length - 1 && <ArrowRight size={16} className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 text-violet-300/60 md:block" />}
              </motion.div>
            );
          })}
        </div>
        <p className="mt-3 text-center text-xs text-violet-200/50">…then repeat — stronger every lap.</p>
      </Section>

      {/* 2. CARDS */}
      <Section id="cards" n={2} title="Reading a card" sub="Every number on a card matters in battle.">
        <div className="grid items-center gap-8 md:grid-cols-[1fr_280px_1fr]">
          <div className="space-y-3">
            <Callout n={1} title="Element emblem" body="Its type. Decides strengths and weaknesses (see Elements)." />
            <Callout n={2} title="Level crest" body={`Level 1–${MAX_MONSTER_LEVEL}. Each level adds +6% base stats.`} />
            <Callout n={3} title="Form & boosts" body={`Green/red arrow = form (±${FORM_STEP_PCT}% per point). Gold chevrons = bought boost ranks.`} />
            <Callout n={4} title="Name & rarity gems" body="1–4 gems: Common, Rare, Epic, Legendary." />
          </div>
          <div className="relative mx-auto w-[260px]">
            <MonsterCard monster={sample} size="lg" interactive eager />
            {[
              [1, '-4%', '9%'],
              [2, '104%', '9%'],
              [3, '104%', '27%'],
              [4, '-4%', '62%'],
              [5, '-4%', '74%'],
              [6, '104%', '86%'],
              [7, '50%', '102%'],
            ].map(([n, x, y]) => (
              <span key={n} className="pointer-events-none absolute z-10 grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-cyan-400 text-xs font-extrabold text-night-950 shadow-[0_0_14px_rgba(34,211,238,0.9)] ring-2 ring-night-950" style={{ left: x, top: y }}>
                {n}
              </span>
            ))}
          </div>
          <div className="space-y-3">
            <Callout n={5} title="Special ability" body="Its strongest move, with a cooldown. Hover a card to read it." />
            <Callout n={6} title="Stats" body="HP (health) · ATK (damage) · DEF (damage taken) · SPD (who moves first)." />
            <Callout n={7} title="XP bar" body="Fills from battle XP. Full bar = level up (if under the level cap)." />
            <div className="panel-soft p-3 text-xs text-violet-200/70">Power = a quick strength rating combining all four stats.</div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {RARITIES.map((r) => {
            const s = SPECIES.find((x) => x.rarity === r)!;
            return (
              <div key={r} className="panel flex items-center gap-3 p-3" data-rarity={r}>
                <div className="mcard w-14 shrink-0 !p-[3px]" data-rarity={r}>
                  <div className="mcard-inner !rounded-[9px]">
                    <MonsterImg image={s.image} size="thumb" alt={s.name} className="aspect-[3/4] w-full" />
                  </div>
                </div>
                <div>
                  <div className="font-bold" style={{ color: RARITY_META[r].color }}>
                    {RARITY_META[r].label}
                  </div>
                  <div className="text-[11px] text-violet-200/65">×{RARITY_META[r].statMult} base stats</div>
                  <div className="text-[10px] text-violet-200/45">{r === 'legendary' ? 'Gold animated frame' : r === 'epic' ? 'Holo foil frame' : r === 'rare' ? 'Sapphire frame' : 'Steel frame'}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* 3. ELEMENTS */}
      <Section id="elements" n={3} title="Elements" sub="Attacking a weakness deals ×1.5 damage. Attacking a resistance deals ×0.67.">
        <div className="grid items-center gap-8 md:grid-cols-[360px_1fr]">
          <ElementWheel />
          <div className="grid gap-2 sm:grid-cols-2">
            {ELEMENTS.map((e) => (
              <div key={e} className="panel-soft flex items-center gap-3 p-3">
                <span className="grid h-10 w-10 place-items-center rounded-full" style={{ background: ELEMENT_META[e].soft, boxShadow: `0 0 0 1.5px ${ELEMENT_META[e].color}` }}>
                  <ElementIcon element={e} size={18} />
                </span>
                <div className="text-sm">
                  <div className="font-bold text-white">{ELEMENT_META[e].label}</div>
                  <div className="text-xs text-violet-200/65">
                    Beats{' '}
                    {STRONG_AGAINST[e].map((t) => (
                      <b key={t} className="mr-1" style={{ color: ELEMENT_META[t].color }}>
                        {ELEMENT_META[t].label}
                      </b>
                    ))}
                  </div>
                </div>
                <span className="ml-auto rounded-md bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">×1.5</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* 4. BATTLE */}
      <Section id="battle" n={4} title="Battle" sub="3 vs 3, one monster active per side. Knock out all three rival monsters to win.">
        <h3 className="mb-3 font-display text-xl text-white">Your five actions</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            [Swords, 'Attack', 'Power 40 hit. Always available.', '#a78bfa'],
            [Zap, 'Special', 'Big ability + effect, then cooldown.', '#fb923c'],
            [ShieldHalf, 'Defend', 'Halve damage this turn and heal 6%.', '#60a5fa'],
            [ArrowLeftRight, 'Switch', 'Swap in a reserve. Goes first.', '#22d3ee'],
            [FlaskConical, 'Items', `Up to ${ITEMS_PER_BATTLE} per battle. Goes first.`, '#4ade80'],
          ].map(([Icon, t, d, c], i) => {
            const I = Icon as typeof Swords;
            return (
              <div key={t as string} className="panel p-4">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${c}22`, color: c as string }}>
                    <I size={19} />
                  </span>
                  <kbd className="rounded bg-black/30 px-1.5 text-[10px] text-white/50">{i + 1}</kbd>
                </div>
                <div className="mt-2 font-bold text-white">{t as string}</div>
                <div className="text-xs text-violet-200/65">{d as string}</div>
              </div>
            );
          })}
        </div>

        <h3 className="mb-3 mt-8 font-display text-xl text-white">Turn order</h3>
        <div className="flex flex-col gap-2 md:flex-row md:items-stretch">
          {[
            ['1', 'Pick an action', 'You and the rival choose at the same time.'],
            ['2', 'Switch / Item / Defend', 'These always resolve first.'],
            ['3', 'Faster attacks first', 'Higher SPD moves first. Ties are random.'],
            ['4', 'End of round', 'Burn ticks, cooldowns and buffs count down.'],
            ['5', 'Replace the fallen', 'A knocked-out monster is swapped for free.'],
          ].map(([n, t, d], i, arr) => (
            <div key={n} className="flex flex-1 items-center gap-2">
              <div className="panel flex-1 p-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-blue-600 text-[11px] font-extrabold text-white">{n}</span>
                  <span className="text-sm font-bold text-white">{t}</span>
                </div>
                <p className="mt-1 text-[11px] text-violet-200/65">{d}</p>
              </div>
              {i < arr.length - 1 && <ArrowRight size={16} className="hidden shrink-0 text-violet-300/50 md:block" />}
            </div>
          ))}
        </div>

        <h3 className="mb-3 mt-8 font-display text-xl text-white">How damage works</h3>
        <div className="panel flex flex-wrap items-center justify-center gap-2 p-5 text-sm font-bold">
          <Chip c="#fb923c">Move power</Chip>
          <Op>×</Op>
          <Chip c="#a78bfa">ATK ÷ (ATK + DEF)</Chip>
          <Op>×</Op>
          <Chip c="#4ade80">Element ×1.5 / ×1 / ×0.67</Chip>
          <Op>×</Op>
          <Chip c="#fbbf24">Crit ×1.5 (8%)</Chip>
          <Op>×</Op>
          <Chip c="#60a5fa">Defend / Shield ×0.5</Chip>
        </div>

        <h3 className="mb-3 mt-8 font-display text-xl text-white">Special effects</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {[
            [Flame, 'Burn', 'Loses 6% max HP at the end of each round for 3 rounds.', '#fb923c'],
            [Zap, 'Stun', '40% chance the target skips its next action.', '#facc15'],
            [Shield, 'Shield', 'Halves the next 2 hits taken.', '#60a5fa'],
            [HeartPulse, 'Heal', 'Restores 25% of max HP after striking.', '#4ade80'],
            [Sparkles, 'Drain', 'Heals for half the damage dealt.', '#c084fc'],
            [Sword, 'Pierce', 'Ignores half of the target’s defense.', '#f472b6'],
          ].map(([Icon, t, d, c]) => {
            const I = Icon as typeof Swords;
            return (
              <div key={t as string} className="panel-soft flex items-start gap-3 p-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: `${c}22`, color: c as string }}>
                  <I size={17} />
                </span>
                <div>
                  <div className="text-sm font-bold text-white">{t as string}</div>
                  <div className="text-xs text-violet-200/65">{d as string}</div>
                </div>
              </div>
            );
          })}
        </div>

        <h3 className="mb-3 mt-8 font-display text-xl text-white">Difficulty</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ['Rookie', 'Rivals ≈ 1 level below your team', '×1 rewards', Shield],
            ['Veteran', 'Rivals ≈ 1 level above · smart switching', '×1.6 coins · ×1.4 XP', Swords],
            ['Champion', 'Rivals ≈ 3 levels above · always a legendary', '×2.5 coins · ×2 XP', Crown],
          ].map(([t, d, r, Icon]) => {
            const I = Icon as typeof Swords;
            return (
              <div key={t as string} className="panel flex items-center gap-3 p-4">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-amber-300 to-orange-500 text-night-950">
                  <I size={19} />
                </span>
                <div>
                  <div className="font-bold text-white">{t as string}</div>
                  <div className="text-xs text-violet-200/65">{d as string}</div>
                  <div className="text-xs font-bold text-amber-200">{r as string}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* 5. PERFORMANCE */}
      <Section id="performance" n={5} title="Performance, grades & form" sub="After every match, each monster that fought is graded. Grades decide XP and move its form up or down.">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="panel p-5">
            <h3 className="mb-4 font-bold text-white">Score (0–100)</h3>
            {[
              ['Damage dealt', 45, '#fb923c', 'vs the rival team’s total HP'],
              ['Knockouts', 30, '#f472b6', '15 per KO'],
              ['Survived', 15, '#4ade80', 'still standing at the end'],
              ['HP remaining', 10, '#38bdf8', 'more HP left = more points'],
            ].map(([t, v, c, d]) => (
              <div key={t as string} className="mb-3">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-bold text-white">{t as string}</span>
                  <span className="text-violet-200/60">
                    up to <b className="text-white">{v as number}</b> · {d as string}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div className="h-full rounded-full" style={{ background: c as string }} initial={{ width: 0 }} whileInView={{ width: `${v}%` }} viewport={{ once: true }} transition={{ duration: 0.8 }} />
                </div>
              </div>
            ))}
            <p className="mt-2 text-[11px] text-violet-200/50">On a loss, grades are capped at B. Monsters left on the bench get 30% XP and keep their form.</p>
          </div>

          <div className="panel p-5">
            <h3 className="mb-4 font-bold text-white">Grade ladder</h3>
            <div className="space-y-2">
              {(['S', 'A', 'B', 'C', 'D'] as const).map((gr) => {
                const gm = GRADE_META[gr];
                return (
                  <div key={gr} className="flex items-center gap-3 rounded-xl bg-black/25 p-2.5">
                    <span className="grid h-10 w-10 place-items-center rounded-xl font-display text-2xl" style={{ color: gm.color, background: `${gm.color}1a`, boxShadow: `inset 0 0 0 1.5px ${gm.color}66` }}>
                      {gr}
                    </span>
                    <div className="flex-1 text-sm">
                      <div className="font-bold text-white">{gm.label}</div>
                      <div className="text-[11px] text-violet-200/60">score {gm.min}+</div>
                    </div>
                    <span className="rounded-lg bg-cyan-400/10 px-2 py-1 text-xs font-bold text-cyan-200">×{gm.xpMult} XP</span>
                    <span className={`w-16 rounded-lg px-2 py-1 text-center text-xs font-bold ${gm.form > 0 ? 'bg-emerald-400/10 text-emerald-300' : gm.form < 0 ? 'bg-red-400/10 text-red-300' : 'bg-white/5 text-violet-200/60'}`}>
                      form {gm.form > 0 ? '+' : ''}
                      {gm.form}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="panel mt-6 p-5">
          <h3 className="font-bold text-white">Form meter</h3>
          <p className="mb-4 text-xs text-violet-200/60">Form ranges from −5 to +5. Every point changes all stats by {FORM_STEP_PCT}% — a hot streak makes a monster up to 10% stronger, a slump up to 10% weaker.</p>
          <div className="grid grid-cols-11 gap-1">
            {Array.from({ length: 11 }, (_, i) => i - 5).map((f) => (
              <div key={f} className="text-center">
                <div className="h-8 rounded-lg" style={{ background: f > 0 ? `rgba(74,222,128,${0.15 + f * 0.15})` : f < 0 ? `rgba(248,113,113,${0.15 + -f * 0.15})` : 'rgba(255,255,255,0.08)' }} />
                <div className="mt-1 text-[10px] font-bold text-white">{f > 0 ? `+${f}` : f}</div>
                <div className="text-[9px] text-violet-200/50">{f * FORM_STEP_PCT > 0 ? '+' : ''}{f * FORM_STEP_PCT}%</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* 6. LEVELS */}
      <Section id="levels" n={6} title="The level system" sub="Two levels work together: yours (Summoner) and each monster’s.">
        <div className="grid gap-6 lg:grid-cols-2">
          <RuleCard icon={<Crown size={20} />} color="#22d3ee" title="Summoner level">
            <Rule>Earn XP from every match (more for wins, harder difficulty and better team score), daily chests and quests.</Rule>
            <Rule>Each level up pays <b>+{SUMMONER_LEVEL_COINS} coins</b>.</Rule>
            <Rule>Unlocks new locked monsters (they still cost coins).</Rule>
            <Rule>
              Raises your <b>monster level cap</b> = Summoner level + {LEVEL_CAP_OVER_SUMMONER}.
            </Rule>
          </RuleCard>
          <RuleCard icon={<ChevronsUp size={20} />} color="#a78bfa" title="Monster level">
            <Rule>Every monster starts at <b>level 1</b> — including unlocks and creations.</Rule>
            <Rule>XP only comes from battles, scaled by its performance grade.</Rule>
            <Rule>Each level: +6% base stats. Max level {MAX_MONSTER_LEVEL}.</Rule>
            <Rule>At the cap, XP is held until your Summoner levels up — nothing is lost.</Rule>
          </RuleCard>
        </div>

        <div className="panel mt-6 p-5">
          <h3 className="mb-3 font-bold text-white">Example: the level cap</h3>
          <div className="flex flex-wrap items-center justify-center gap-3 text-center">
            <div className="rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-600 px-5 py-3">
              <div className="text-[10px] font-bold uppercase text-white/80">Summoner</div>
              <div className="font-display text-3xl text-white">Lv 4</div>
            </div>
            <span className="font-display text-2xl text-violet-300">+ {LEVEL_CAP_OVER_SUMMONER} =</span>
            <div className="rounded-2xl border border-amber-300/40 bg-amber-400/10 px-5 py-3">
              <div className="text-[10px] font-bold uppercase text-amber-200/80">Monsters can reach</div>
              <div className="font-display text-3xl text-amber-100">Lv 7</div>
            </div>
          </div>
        </div>

        <div className="panel mt-6 p-5">
          <h3 className="mb-1 font-bold text-white">Locked monsters need both</h3>
          <p className="mb-4 text-xs text-violet-200/60">
            <Lock size={11} className="inline" /> Summoner level <b>and</b> <Coins size={11} className="inline" /> coins. Unlock from the Collection page.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {UNLOCKS.map((u) => {
              const s = getSpecies(u.speciesId)!;
              return (
                <div key={u.speciesId} className="flex items-center gap-2 rounded-xl bg-black/25 p-2">
                  <MonsterImg image={s.image} size="thumb" alt={s.name} className="h-11 w-9 rounded-lg" />
                  <div className="min-w-0 text-[11px]">
                    <div className="truncate font-bold text-white">{s.name}</div>
                    <div className="text-amber-200">Lv {u.level}</div>
                    <div className="text-violet-200/60">{u.coins.toLocaleString()} c</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* 7. SHOP */}
      <Section id="shop" n={7} title="Shop: boosts, skills & items" sub="Spend coins to make your monsters stronger.">
        <div className="grid gap-4 md:grid-cols-3">
          <RuleCard icon={<ChevronsUp size={20} />} color="#fbbf24" title="Stat boosts">
            <Rule>Permanent +{BOOST_PCT}% to HP, ATK, DEF or SPD per rank.</Rule>
            <Rule>Up to {BOOST_MAX_RANK} ranks per stat.</Rule>
            <Rule>
              Rank N needs monster <b>level N</b>.
            </Rule>
            <Rule>Price rises with each rank.</Rule>
          </RuleCard>
          <RuleCard icon={<Zap size={20} />} color="#fb923c" title="Special skills">
            <Rule>Universal skills any monster can learn, plus element skills.</Rule>
            <Rule>Each needs a minimum monster level.</Rule>
            <Rule>Level 10 unlocks an element Ultimate.</Rule>
            <Rule>One special equipped at a time — swap freely.</Rule>
          </RuleCard>
          <RuleCard icon={<FlaskConical size={20} />} color="#4ade80" title="Battle items">
            {ITEMS.map((it) => (
              <div key={it.id} className="flex items-center gap-2 text-xs text-violet-100/80">
                <span className="scale-75">
                  <ItemIcon id={it.id} />
                </span>
                <span>
                  <b className="text-white">{it.name}</b> — {it.description}
                </span>
              </div>
            ))}
            <Rule>
              Max {ITEMS_PER_BATTLE} per battle · buffs are +{BUFF_PCT}% for 3 turns.
            </Rule>
          </RuleCard>
        </div>
      </Section>

      {/* 8. REWARDS */}
      <Section id="rewards" n={8} title="Rewards" sub="Ways to earn coins and XP outside of battle.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            [Gift, 'Daily chest', 'Claim once a day. Streaks grow to a big day-7 bonus.', '#fb923c'],
            [Target, 'Daily quests', 'Win battles, use specials, create and upgrade.', '#22d3ee'],
            [Trophy, 'Achievements', 'One-time badges with coin rewards.', '#fbbf24'],
            [LayoutGrid, 'Milestones', 'Own 15, 20, 25, 35 monsters for bonus coins.', '#a78bfa'],
          ].map(([Icon, t, d, c]) => {
            const I = Icon as typeof Swords;
            return (
              <div key={t as string} className="panel p-4">
                <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${c}22`, color: c as string }}>
                  <I size={19} />
                </span>
                <div className="mt-2 font-bold text-white">{t as string}</div>
                <div className="text-xs text-violet-200/65">{d as string}</div>
              </div>
            );
          })}
        </div>
      </Section>

      <section className="panel relative overflow-hidden p-8 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(500px_200px_at_50%_0%,rgba(251,146,60,0.25),transparent)]" />
        <h2 className="relative font-display text-3xl text-white">Ready, Summoner?</h2>
        <p className="relative mt-1 text-violet-200/70">Your monsters are waiting at level 1. Make them legends.</p>
        <div className="relative mt-5 flex flex-wrap justify-center gap-3">
          <button className="btn btn-ember px-6 py-3" onClick={() => go('battle')}>
            <Swords size={17} /> Enter the Arena
          </button>
          <button className="btn btn-ghost px-6 py-3" onClick={() => go('shop')}>
            <ShoppingBag size={17} /> Visit the Shop
          </button>
        </div>
      </section>
    </div>
  );
}

function Section({ id, n, title, sub, children }: { id: string; n: number; title: string; sub: string; children: ReactNode }) {
  return (
    <section id={`g-${id}`} className="scroll-mt-24">
      <div className="mb-5 flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 font-display text-xl text-white shadow-[0_0_24px_-4px_rgba(139,92,246,0.8)]">{n}</span>
        <div>
          <h2 className="font-display text-3xl text-white">{title}</h2>
          <p className="text-sm text-violet-200/70">{sub}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Callout({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="panel-soft flex items-start gap-3 p-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-cyan-400 text-xs font-extrabold text-night-950">{n}</span>
      <div>
        <div className="text-sm font-bold text-white">{title}</div>
        <div className="text-xs text-violet-200/65">{body}</div>
      </div>
    </div>
  );
}

function RuleCard({ icon, color, title, children }: { icon: ReactNode; color: string; title: string; children: ReactNode }) {
  return (
    <div className="panel relative overflow-hidden p-5">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl" style={{ background: `${color}30` }} />
      <div className="relative mb-3 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: `${color}22`, color }}>
          {icon}
        </span>
        <h3 className="font-display text-xl text-white">{title}</h3>
      </div>
      <div className="relative space-y-2">{children}</div>
    </div>
  );
}

function Rule({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm text-violet-100/80">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
      <span className="[&_b]:text-white">{children}</span>
    </div>
  );
}

const Chip = ({ c, children }: { c: string; children: ReactNode }) => (
  <span className="rounded-xl px-3 py-2" style={{ background: `${c}1f`, color: c, boxShadow: `inset 0 0 0 1px ${c}55` }}>
    {children}
  </span>
);
const Op = ({ children }: { children: ReactNode }) => <span className="text-lg text-violet-300/60">{children}</span>;

/** SVG wheel showing every "beats" relationship. */
function ElementWheel() {
  const order: Element[] = ['fire', 'nature', 'water', 'electric', 'crystal', 'shadow'];
  const R = 130;
  const C = 180;
  const pos = (e: Element) => {
    const i = order.indexOf(e);
    const a = (Math.PI * 2 * i) / order.length - Math.PI / 2;
    return { x: C + R * Math.cos(a), y: C + R * Math.sin(a) };
  };
  const arrows = ELEMENTS.flatMap((from) => STRONG_AGAINST[from].map((to) => ({ from, to })));
  return (
    <svg viewBox="0 0 360 360" className="mx-auto w-full max-w-[360px]" role="img" aria-label="Element advantage wheel">
      <defs>
        {ELEMENTS.map((e) => (
          <marker key={e} id={`arr-${e}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={ELEMENT_META[e].color} />
          </marker>
        ))}
        <radialGradient id="wheelBg">
          <stop offset="0" stopColor="#2a1f66" stopOpacity="0.6" />
          <stop offset="1" stopColor="#0b0820" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={C} cy={C} r={R + 40} fill="url(#wheelBg)" />
      <circle cx={C} cy={C} r={R} fill="none" stroke="rgba(167,139,250,0.15)" strokeDasharray="4 6" />
      {arrows.map(({ from, to }) => {
        const a = pos(from);
        const b = pos(to);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy);
        const ux = dx / len;
        const uy = dy / len;
        const s = { x: a.x + ux * 30, y: a.y + uy * 30 };
        const t = { x: b.x - ux * 32, y: b.y - uy * 32 };
        // gentle curve
        const mx = (s.x + t.x) / 2 + (C - (s.x + t.x) / 2) * 0.18;
        const my = (s.y + t.y) / 2 + (C - (s.y + t.y) / 2) * 0.18;
        return <path key={from + to} d={`M${s.x},${s.y} Q${mx},${my} ${t.x},${t.y}`} fill="none" stroke={ELEMENT_META[from].color} strokeWidth="2.5" strokeOpacity="0.85" markerEnd={`url(#arr-${from})`} />;
      })}
      {order.map((e) => {
        const p = pos(e);
        return (
          <g key={e}>
            <circle cx={p.x} cy={p.y} r="26" fill="#0b0820" stroke={ELEMENT_META[e].color} strokeWidth="2.5" style={{ filter: `drop-shadow(0 0 8px ${ELEMENT_META[e].glow})` }} />
            <foreignObject x={p.x - 11} y={p.y - 11} width="22" height="22">
              <div style={{ display: 'grid', placeItems: 'center', width: 22, height: 22 }}>
                <ElementIcon element={e} size={20} />
              </div>
            </foreignObject>
            <text x={p.x} y={p.y + 44} textAnchor="middle" fontSize="12" fontWeight="700" fill={ELEMENT_META[e].color}>
              {ELEMENT_META[e].label}
            </text>
          </g>
        );
      })}
      <text x={C} y={C - 4} textAnchor="middle" fontSize="13" fontWeight="800" fill="white">
        Arrow = beats
      </text>
      <text x={C} y={C + 14} textAnchor="middle" fontSize="11" fill="rgba(221,214,254,0.6)">
        ×1.5 damage
      </text>
    </svg>
  );
}
