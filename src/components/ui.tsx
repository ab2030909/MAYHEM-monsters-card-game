import { memo, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Droplets, Flame, Gem, Leaf, Moon, X, Zap, Sparkles, type LucideIcon } from 'lucide-react';
import type { Element, MonsterImage, Rarity } from '../game/types';
import { ELEMENT_META, RARITY_META } from '../game/elements';
import { imageFallbackUrl, imageUrl, type ImageSize } from '../services/cloudinary';

export const ELEMENT_ICON: Record<Element, LucideIcon> = {
  fire: Flame,
  water: Droplets,
  nature: Leaf,
  electric: Zap,
  shadow: Moon,
  crystal: Gem,
};

export function ElementIcon({ element, size = 14, className = '' }: { element: Element; size?: number; className?: string }) {
  const Icon = ELEMENT_ICON[element];
  return <Icon size={size} className={className} style={{ color: ELEMENT_META[element].color }} />;
}

export function ElementBadge({ element, compact = false }: { element: Element; compact?: boolean }) {
  const m = ELEMENT_META[element];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider"
      style={{ background: m.soft, color: m.color, border: `1px solid ${m.color}40`, fontSize: compact ? 9 : 10, padding: compact ? '2px 6px' : '3px 8px' }}
    >
      <ElementIcon element={element} size={compact ? 10 : 12} />
      {!compact && m.label}
    </span>
  );
}

export function RarityBadge({ rarity, className = '' }: { rarity: Rarity; className?: string }) {
  const m = RARITY_META[rarity];
  const legendary = rarity === 'legendary';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[10px] font-extrabold uppercase tracking-[0.12em] ${className}`}
      style={{
        color: legendary ? '#1a0f00' : m.color,
        background: legendary ? 'linear-gradient(90deg,#fde68a,#fbbf24,#fb923c)' : `${m.color}1f`,
        border: legendary ? 'none' : `1px solid ${m.color}55`,
        boxShadow: legendary ? '0 0 14px rgba(251,191,36,0.6)' : undefined,
      }}
    >
      {legendary && <Sparkles size={10} />}
      {m.label}
    </span>
  );
}

/** Monster artwork with lazy-loading, skeleton and graceful fallback (e.g. Cloudinary bg-removal missing). */
export const MonsterImg = memo(function MonsterImg({
  image,
  size = 'card',
  alt,
  className = '',
  eager = false,
  focus = '50% 28%',
}: {
  image: MonsterImage;
  size?: ImageSize;
  alt: string;
  className?: string;
  eager?: boolean;
  /** object-position — biased upward so faces/heads stay in frame. */
  focus?: string;
}) {
  const primary = useMemo(() => imageUrl(image, size), [image, size]);
  const [src, setSrc] = useState(primary);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setSrc(primary);
    setLoaded(false);
    setFailed(false);
  }, [primary]);
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!loaded && !failed && <div className="skeleton absolute inset-0" />}
      {failed ? (
        <div className="absolute inset-0 grid place-items-center bg-night-800 text-xs text-violet-300/70">Artwork unavailable</div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
          onLoad={() => setLoaded(true)}
          onError={() => {
            const fb = imageFallbackUrl(image, size);
            if (fb && src !== fb) setSrc(fb);
            else setFailed(true);
          }}
          style={{ objectPosition: focus }}
          className={`h-full w-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  );
});

export function StatBar({ label, value, max = 160, color }: { label: string; value: number; max?: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-7 text-[10px] font-bold tracking-wider text-violet-200/60">{label}</span>
      <div className="stat-track flex-1">
        <div className="stat-fill" style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color, boxShadow: `0 0 8px ${color}` }} />
      </div>
      <span className="w-7 text-right text-[11px] font-bold tabular-nums text-white/90">{value}</span>
    </div>
  );
}

export const STAT_COLORS = { hp: '#4ade80', attack: '#fb923c', defense: '#38bdf8', speed: '#facc15' };

export function ProgressBar({ value, max, color = 'linear-gradient(90deg,#8b5cf6,#22d3ee)', className = '', height = 8 }: { value: number; max: number; color?: string; className?: string; height?: number }) {
  return (
    <div className={`overflow-hidden rounded-full bg-white/[0.07] ${className}`} style={{ height }}>
      <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${Math.min(100, (value / Math.max(1, max)) * 100)}%` }} transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }} />
    </div>
  );
}

export function CoinIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <defs>
        <linearGradient id="coinG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#coinG)" stroke="#b45309" strokeWidth="1.5" />
      <path d="M12 6.5l1.6 3.4 3.7.4-2.8 2.5.8 3.7L12 14.6l-3.3 1.9.8-3.7-2.8-2.5 3.7-.4z" fill="#b45309" opacity="0.85" />
    </svg>
  );
}

export const Particles = memo(function Particles({ count = 24, color }: { count?: number; color?: string }) {
  const parts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 2 + Math.random() * 4,
        delay: Math.random() * 14,
        dur: 12 + Math.random() * 14,
        bottom: -10 - Math.random() * 20,
      })),
    [count],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {parts.map((p) => (
        <span
          key={p.id}
          className="particle"
          style={{
            left: `${p.left}%`,
            bottom: `${p.bottom}px`,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            background: color ? `radial-gradient(circle, ${color}, transparent 70%)` : undefined,
          }}
        />
      ))}
    </div>
  );
});

export function Modal({ open, onClose, children, wide = false, label }: { open: boolean; onClose: () => void; children: ReactNode; wide?: boolean; label: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-night-950/80 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className={`panel relative max-h-[92vh] w-full overflow-y-auto rounded-b-none sm:rounded-b-[1.25rem] ${wide ? 'max-w-5xl' : 'max-w-lg'}`}
            initial={{ y: 40, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          >
            <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white/80 transition hover:bg-white/10 hover:text-white">
              <X size={18} />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300/80">{eyebrow}</div>}
        <h2 className="font-display text-2xl tracking-wide text-white sm:text-[28px]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="panel relative flex flex-col items-center overflow-hidden px-6 py-14 text-center">
      <div className="absolute inset-0 bg-[radial-gradient(400px_200px_at_50%_0%,rgba(139,92,246,0.2),transparent)]" />
      <div className="relative mb-4 grid h-16 w-16 place-items-center rounded-2xl border border-violet-400/30 bg-violet-500/10 text-violet-300">{icon}</div>
      <h3 className="relative font-display text-xl text-white">{title}</h3>
      <p className="relative mt-1 max-w-sm text-sm text-violet-200/70">{body}</p>
      {action && <div className="relative mt-5">{action}</div>}
    </div>
  );
}
