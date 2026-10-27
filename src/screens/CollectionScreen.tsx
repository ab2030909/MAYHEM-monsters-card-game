import { useDeferredValue, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDownUp, Check, Heart, Search, SearchX, Sparkles, X } from 'lucide-react';
import type { Screen } from '../components/Layout';
import type { Element, Monster, Rarity } from '../game/types';
import { ELEMENTS, ELEMENT_META, RARITIES, RARITY_META } from '../game/elements';
import { SPECIES, unlockRuleFor } from '../game/monsters';
import { MILESTONES } from '../game/progression';
import { power } from '../game/stats';
import { useGame } from '../state/GameContext';
import { LockedCard, MonsterCard } from '../components/MonsterCard';
import { MonsterDetail } from '../components/MonsterDetail';
import { LevelRoad } from '../components/LevelRoad';
import { CoinIcon, ElementIcon, EmptyState, ProgressBar, SectionTitle } from '../components/ui';

type SortKey = 'power' | 'level' | 'rarity' | 'newest' | 'name';
const SORTS: { id: SortKey; label: string }[] = [
  { id: 'power', label: 'Power' },
  { id: 'level', label: 'Level' },
  { id: 'rarity', label: 'Rarity' },
  { id: 'newest', label: 'Newest' },
  { id: 'name', label: 'Name' },
];

export function CollectionScreen({ go }: { go: (s: Screen) => void }) {
  const g = useGame();
  const p = g.player;
  const [query, setQuery] = useState('');
  const q = useDeferredValue(query);
  const [elements, setElements] = useState<Element[]>([]);
  const [rarities, setRarities] = useState<Rarity[]>([]);
  const [sort, setSort] = useState<SortKey>('power');
  const [favOnly, setFavOnly] = useState(false);
  const [detail, setDetail] = useState<Monster | null>(null);

  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = p.monsters.filter(
      (m) =>
        (!term || m.name.toLowerCase().includes(term)) &&
        (!elements.length || elements.includes(m.element)) &&
        (!rarities.length || rarities.includes(m.rarity)) &&
        (!favOnly || m.favorite),
    );
    const cmp: Record<SortKey, (a: Monster, b: Monster) => number> = {
      power: (a, b) => power(b) - power(a),
      level: (a, b) => b.level - a.level || power(b) - power(a),
      rarity: (a, b) => RARITY_META[b.rarity].rank - RARITY_META[a.rarity].rank || b.level - a.level,
      newest: (a, b) => b.createdAt - a.createdAt,
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return filtered.sort(cmp[sort]);
  }, [p.monsters, q, elements, rarities, sort, favOnly]);

  const owned = new Set(p.monsters.map((m) => m.speciesId).filter((x): x is string => !!x));
  const locked = SPECIES.filter((s) => !owned.has(s.id));
  const lockedShown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return locked
      .map((s) => ({ s, rule: unlockRuleFor(s.id)! }))
      .filter(({ s, rule }) => rule && (!term || s.name.toLowerCase().includes(term)) && (!elements.length || elements.includes(s.element)) && (!rarities.length || rarities.includes(s.rarity)) && !favOnly)
      .sort((a, b) => a.rule.level - b.rule.level);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.monsters, q, elements, rarities, favOnly]);
  const custom = p.monsters.filter((m) => m.custom).length;
  const hasFilters = !!(query || elements.length || rarities.length || favOnly);
  const nextMilestone = MILESTONES.find((m) => !p.claimedMilestones.includes(m.count));

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300/80">Your monsters</div>
          <h1 className="font-display text-4xl tracking-wide text-white sm:text-5xl">Collection</h1>
        </div>
        <div className="grid grid-cols-3 gap-3 md:w-[520px]">
          <div className="panel p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-violet-200/60">Bestiary</div>
            <div className="font-display text-xl text-white">
              {owned.size}/{SPECIES.length}
            </div>
            <ProgressBar value={owned.size} max={SPECIES.length} height={4} className="mt-1" color="linear-gradient(90deg,#fbbf24,#fb923c)" />
          </div>
          <div className="panel p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-violet-200/60">Originals</div>
            <div className="font-display text-xl text-white">{custom}</div>
            <div className="text-[10px] text-violet-200/50">created by you</div>
          </div>
          <div className="panel p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-violet-200/60">Milestone</div>
            {nextMilestone ? (
              <>
                <div className="font-display text-xl text-white">
                  {Math.min(p.monsters.length, nextMilestone.count)}/{nextMilestone.count}
                </div>
                {p.monsters.length >= nextMilestone.count ? (
                  <button className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-amber-200" onClick={() => g.claimMilestone(nextMilestone.count)}>
                    <CoinIcon size={11} /> Claim {nextMilestone.coins}
                  </button>
                ) : (
                  <ProgressBar value={p.monsters.length} max={nextMilestone.count} height={4} className="mt-1" />
                )}
              </>
            ) : (
              <div className="font-display text-xl text-amber-300">All done</div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="panel sticky top-[68px] z-20 mb-6 space-y-3 p-3 backdrop-blur-xl sm:p-4 lg:top-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-violet-300/60" />
            <input className="input !pl-10" placeholder="Search monsters by name…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search monsters" />
            {query && (
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-300/60 hover:text-white" onClick={() => setQuery('')} aria-label="Clear search">
                <X size={16} />
              </button>
            )}
          </label>
          <div className="flex gap-2">
            <label className="relative">
              <ArrowDownUp size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-violet-300/60" />
              <select className="input cursor-pointer appearance-none !pl-9 !pr-8" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort by">
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id} className="bg-night-900">
                    Sort: {s.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="chip !px-3" data-active={favOnly} style={{ ['--chip-color' as string]: '#f472b6' }} onClick={() => setFavOnly((v) => !v)} aria-pressed={favOnly}>
              <Heart size={13} /> Favorites
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {ELEMENTS.map((e) => (
            <button key={e} className="chip" data-active={elements.includes(e)} style={{ ['--chip-color' as string]: ELEMENT_META[e].color }} onClick={() => setElements((a) => toggle(a, e))} aria-pressed={elements.includes(e)}>
              <ElementIcon element={e} size={12} /> {ELEMENT_META[e].label}
            </button>
          ))}
          <span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />
          {RARITIES.map((r) => (
            <button key={r} className="chip" data-active={rarities.includes(r)} style={{ ['--chip-color' as string]: RARITY_META[r].color }} onClick={() => setRarities((a) => toggle(a, r))} aria-pressed={rarities.includes(r)}>
              {RARITY_META[r].label}
            </button>
          ))}
          {hasFilters && (
            <button
              className="ml-auto text-xs font-semibold text-violet-300 hover:text-white"
              onClick={() => {
                setQuery('');
                setElements([]);
                setRarities([]);
                setFavOnly(false);
              }}
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="mb-3 text-sm text-violet-200/60">
        Showing <b className="text-white">{list.length}</b> of {p.monsters.length} monsters
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<SearchX size={28} />}
          title="No monsters match"
          body={p.monsters.length ? 'Try a different name or loosen your filters — your monsters are hiding somewhere.' : 'Your collection is empty. Create your first monster to begin.'}
          action={
            p.monsters.length ? (
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setQuery('');
                  setElements([]);
                  setRarities([]);
                  setFavOnly(false);
                }}
              >
                Reset filters
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => go('create')}>
                <Sparkles size={16} /> Create a monster
              </button>
            )
          }
        />
      ) : (
        <motion.div layout className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          <AnimatePresence mode="popLayout">
            {list.map((m) => (
              <motion.div key={m.uid} layout initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }} transition={{ duration: 0.2 }}>
                <MonsterCard monster={m} onClick={() => setDetail(m)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Locked monsters — need summoner level AND coins */}
      <section className="mt-14">
        <SectionTitle eyebrow={`${locked.length} still sealed`} title="Locked Monsters" />
        <LevelRoad level={p.level} xp={p.xp} unlocked={owned} onBattle={() => go('battle')} />
        {locked.length === 0 ? (
          <div className="panel mt-5 flex items-center gap-3 p-5 text-amber-200">
            <Check /> Every bestiary monster has joined you. Keep creating originals!
          </div>
        ) : lockedShown.length === 0 ? (
          <p className="mt-5 text-sm text-violet-200/60">No locked monsters match your filters.</p>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {lockedShown.map(({ s, rule }) => (
              <LockedCard key={s.id} species={s} rule={rule} level={p.level} coins={p.coins} onUnlock={() => g.unlockSpecies(s.id)} />
            ))}
          </div>
        )}
      </section>

      <MonsterDetail monster={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
