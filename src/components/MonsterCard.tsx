import { memo, useRef, type MouseEvent, type ReactNode } from 'react';
import { Check, ChevronsUp, Coins, Crown, Gauge, Heart, HeartPulse, Lock, Shield, Sparkles, Sword, TrendingDown, TrendingUp, X, Zap } from 'lucide-react';
import type { Element, Monster, MonsterImage, Rarity, Species, Stats } from '../game/types';
import { monsterStats, monsterXpToNext } from '../game/stats';
import { activeAbility } from '../game/rules';
import { ELEMENT_META, RARITY_META } from '../game/elements';
import type { UnlockRule } from '../game/monsters';
import { ELEMENT_ICON, MonsterImg } from './ui';
import { ElementFX } from './fx';

/* ——— Shared frame pieces ——— */

function useTilt<T extends HTMLElement>(enabled: boolean) {
  const ref = useRef<T | null>(null);
  const onMove = (e: MouseEvent) => {
    const node = ref.current;
    if (!node || !enabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = node.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    node.style.transform = `perspective(1000px) rotateY(${(x - 0.5) * 9}deg) rotateX(${(0.5 - y) * 9}deg) translateY(-6px)`;
    node.style.setProperty('--foil-x', `${x * 100}%`);
    node.style.setProperty('--foil-y', `${y * 100}%`);
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = '';
  };
  return { ref, onMove, onLeave };
}

function Gems({ rarity }: { rarity: Rarity }) {
  const n = RARITY_META[rarity].rank + 1;
  return (
    <span className="tcg-gems" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <i key={i} className={i < n ? '' : 'off'} />
      ))}
    </span>
  );
}

function CardArt({ image, name, size, eager, element, rarity }: { image: MonsterImage; name: string; size: 'thumb' | 'card'; eager?: boolean; element: Element; rarity: Rarity }) {
  const Icon = ELEMENT_ICON[element];
  const fancy = rarity === 'epic' || rarity === 'legendary';
  return (
    <>
      <div className="tcg-art">
        <MonsterImg image={image} size={size} alt={name} eager={eager} className="h-full w-full" />
      </div>
      <div className="tcg-shade" />
      {fancy && <div className="foil pointer-events-none absolute inset-0" />}
      <div className="tcg-inner-line" />
      {rarity === 'legendary' && (
        <>
          <span className="tcg-corner tl" />
          <span className="tcg-corner tr" />
          <span className="tcg-corner bl" />
          <span className="tcg-corner br" />
        </>
      )}
      <div className="tcg-emblem" title={ELEMENT_META[element].label}>
        <Icon style={{ color: ELEMENT_META[element].color }} />
      </div>
    </>
  );
}

function NameBlock({ name, rarity, element }: { name: string; rarity: Rarity; element: Element }) {
  return (
    <>
      <div className="tcg-name">{name}</div>
      <div className="tcg-sub">
        <Gems rarity={rarity} />
        <span style={{ color: 'var(--rc)' }}>{RARITY_META[rarity].label}</span>
        <span className="text-white/30">•</span>
        <span style={{ color: ELEMENT_META[element].color }}>{ELEMENT_META[element].label}</span>
      </div>
    </>
  );
}

function StatRow({ s }: { s: Stats }) {
  const cells: [ReactNode, number, string, string][] = [
    [<HeartPulse key="h" />, s.hp, 'HP', '#4ade80'],
    [<Sword key="a" />, s.attack, 'ATK', '#fb923c'],
    [<Shield key="d" />, s.defense, 'DEF', '#38bdf8'],
    [<Gauge key="s" />, s.speed, 'SPD', '#facc15'],
  ];
  return (
    <div className="tcg-stats">
      {cells.map(([icon, v, l, c]) => (
        <div key={l} className="tcg-stat" title={l}>
          <span style={{ color: c }} className="contents">
            {icon}
          </span>
          <b>{v}</b>
          <small>{l}</small>
        </div>
      ))}
    </div>
  );
}

/* ——— Owned monster card ——— */

interface Props {
  monster: Monster;
  onClick?: () => void;
  selected?: boolean;
  selectIndex?: number;
  disabled?: boolean;
  size?: 'md' | 'lg';
  interactive?: boolean;
  eager?: boolean;
}

export const MonsterCard = memo(function MonsterCard({ monster: m, onClick, selected, selectIndex, disabled, size = 'md', interactive = true, eager }: Props) {
  const tilt = useTilt<HTMLButtonElement>(interactive);
  const s = monsterStats(m);
  const el = ELEMENT_META[m.element];
  const ab = activeAbility(m);
  const form = m.form ?? 0;
  const boosted = Object.values(m.boosts ?? {}).reduce((a, b) => a + b, 0);

  return (
    <button
      ref={tilt.ref}
      type="button"
      onClick={onClick}
      onMouseMove={tilt.onMove}
      onMouseLeave={tilt.onLeave}
      disabled={disabled}
      data-rarity={m.rarity}
      data-selected={!!selected}
      aria-label={`${m.name}, level ${m.level} ${m.rarity} ${m.element} monster`}
      className={`tcg group outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${size === 'lg' ? 'max-w-[340px]' : ''} ${disabled ? 'opacity-40 grayscale' : ''}`}
      style={{ ['--ec' as string]: el.color }}
    >
      <div className="tcg-body">
        <CardArt image={m.image} name={m.name} size={size === 'lg' ? 'card' : 'thumb'} eager={eager} element={m.element} rarity={m.rarity} />

        <div className="tcg-level">
          <span>
            <small>LV</small>
            <b>{m.level}</b>
          </span>
        </div>

        {m.custom && (
          <span className="tcg-tag left-[5cqw] bg-cyan-400/15 text-cyan-100 ring-1 ring-cyan-300/40">
            <Sparkles /> Original
          </span>
        )}
        {(form !== 0 || boosted > 0) && (
          <div className="absolute right-[4.4cqw] top-[22cqw] z-[4] flex flex-col items-end gap-[1.2cqw]">
            {form !== 0 && (
              <span
                className={`tcg-tag !static ${form > 0 ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-300/40' : 'bg-red-500/20 text-red-200 ring-1 ring-red-300/40'}`}
                title={`Form ${form > 0 ? '+' : ''}${form}: ${form * 2 > 0 ? '+' : ''}${form * 2}% all stats`}
              >
                {form > 0 ? <TrendingUp /> : <TrendingDown />} {form > 0 ? '+' : ''}
                {form}
              </span>
            )}
            {boosted > 0 && (
              <span className="tcg-tag !static bg-amber-400/20 text-amber-100 ring-1 ring-amber-300/40" title={`${boosted} boost ranks`}>
                <ChevronsUp /> {boosted}
              </span>
            )}
          </div>
        )}
        {m.favorite && (
          <span className="tcg-tag left-[5cqw] !top-[29cqw] !px-[1.4cqw] bg-pink-500/20 text-pink-200 ring-1 ring-pink-300/40" title="Favorite">
            <Heart className="fill-current" />
          </span>
        )}

        {selected && <ElementFX element={m.element} count={16} />}
        {selected && (
          <div className="sel-badge absolute inset-0 z-[5] grid place-items-center bg-cyan-400/10">
            <div className="grid h-[22cqw] w-[22cqw] place-items-center rounded-full bg-cyan-400 font-display text-[11cqw] text-night-950 shadow-[0_0_30px_rgba(34,211,238,0.8)]">
              {selectIndex !== undefined ? selectIndex + 1 : <Check className="h-1/2 w-1/2" />}
            </div>
          </div>
        )}

        <div className="tcg-plate">
          <NameBlock name={m.name} rarity={m.rarity} element={m.element} />
          <div className="tcg-rule" />
          <div className="tcg-ability">
            <Zap />
            <span className="truncate">{ab.name}</span>
            <span className="tcg-ability-power">PWR {ab.power}</span>
          </div>
          <div className="tcg-desc">
            <p>{ab.description}</p>
          </div>
          <StatRow s={s} />
          <div className="tcg-xp" title={`${m.xp}/${monsterXpToNext(m.level)} XP`}>
            <div style={{ width: `${(m.xp / monsterXpToNext(m.level)) * 100}%` }} />
          </div>
        </div>
      </div>
    </button>
  );
});

/* ——— Locked monster card (needs level + coins) ——— */

export function LockedCard({ species: s, rule, level, coins, onUnlock }: { species: Species; rule: UnlockRule; level: number; coins: number; onUnlock: () => void }) {
  const tilt = useTilt<HTMLDivElement>(true);
  const levelOk = level >= rule.level;
  const coinsOk = coins >= rule.coins;
  const ready = levelOk && coinsOk;
  const el = ELEMENT_META[s.element];
  return (
    <div
      ref={tilt.ref}
      onMouseMove={tilt.onMove}
      onMouseLeave={tilt.onLeave}
      className="tcg group"
      data-rarity={s.rarity}
      data-locked="true"
      style={{ ['--ec' as string]: el.color }}
      aria-label={`${s.name} — locked. Requires level ${rule.level} and ${rule.coins} coins.`}
    >
      <div className="tcg-body">
        <CardArt image={s.image} name={s.name} size="thumb" element={s.element} rarity={s.rarity} />
        <div className="tcg-level">
          <span>
            <small>REQ</small>
            <b>{rule.level}</b>
          </span>
        </div>
        <div className={`tcg-lock ${ready ? 'animate-pulse' : ''}`}>{ready ? <Crown /> : <Lock />}</div>

        <div className="tcg-plate">
          <NameBlock name={s.name} rarity={s.rarity} element={s.element} />
          <div className="tcg-rule" />
          <div className="space-y-[1.4cqw]">
            <div className="tcg-req" data-ok={levelOk}>
              <span className="flex items-center gap-[1.4cqw]">
                <Crown /> Summoner Lv {rule.level}
              </span>
              {levelOk ? <Check /> : <span className="text-[2.9cqw] opacity-80">Lv {level}</span>}
            </div>
            <div className="tcg-req" data-ok={coinsOk}>
              <span className="flex items-center gap-[1.4cqw]">
                <Coins /> {rule.coins.toLocaleString()} coins
              </span>
              {coinsOk ? <Check /> : <X />}
            </div>
          </div>
          <button type="button" className="tcg-unlock" disabled={!ready} onClick={onUnlock}>
            {ready ? (
              <>
                <Sparkles /> Unlock
              </>
            ) : !levelOk ? (
              <>
                <Lock /> Reach level {rule.level}
              </>
            ) : (
              <>
                <Coins /> Need {(rule.coins - coins).toLocaleString()} more
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
