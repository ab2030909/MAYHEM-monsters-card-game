import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ELEMENT_META, RARITY_META } from '../game/elements';
import type { Element, MonsterImage, Rarity } from '../game/types';
import { MonsterImg } from './ui';
import { sfx } from '../services/sound';

const RC: Record<Rarity, string> = { common: '#94a3b8', rare: '#38bdf8', epic: '#a855f7', legendary: '#fbbf24' };

/** Element-specific ambient particles: fire sparks rise, water bubbles float, leaves drift, sparks crackle, smoke curls, crystals twinkle. */
export function ElementFX({ element, count = 12 }: { element: Element; count?: number }) {
  const parts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: (i * 37 + 11) % 100,
        delay: -((i * 0.73) % 3.2),
        dur: 1.8 + ((i * 7) % 10) / 6,
        size: 3 + (i % 4) * 1.5,
        drift: ((i % 5) - 2) * 14,
      })),
    [count],
  );
  return (
    <span className={`fx fx-${element}`} style={{ ['--el' as string]: ELEMENT_META[element].color }} aria-hidden>
      {parts.map((p, i) => (
        <i
          key={i}
          style={{ left: `${p.left}%`, width: p.size, height: p.size, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, ['--dx' as string]: `${p.drift}px` }}
        />
      ))}
    </span>
  );
}

export interface RevealItem {
  name: string;
  element: Element;
  rarity: Rarity;
  image: MonsterImage;
  label?: string;
}

/** Fire from anywhere to play the big reveal animation. */
export function revealMonster(item: RevealItem) {
  window.dispatchEvent(new CustomEvent('monster-reveal', { detail: item }));
}

export function RevealOverlay() {
  const [item, setItem] = useState<RevealItem | null>(null);
  useEffect(() => {
    const on = (e: Event) => {
      setItem((e as CustomEvent<RevealItem>).detail);
      sfx.reveal();
    };
    window.addEventListener('monster-reveal', on);
    return () => window.removeEventListener('monster-reveal', on);
  }, []);
  useEffect(() => {
    if (!item) return;
    const t = window.setTimeout(() => setItem(null), 4500);
    return () => window.clearTimeout(t);
  }, [item]);

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          className="reveal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setItem(null)}
          style={{ ['--el' as string]: ELEMENT_META[item.element].color, ['--rc' as string]: RC[item.rarity] }}
        >
          <motion.div className="reveal-flash" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.6 }} />
          <div className="reveal-rays">
            {Array.from({ length: 12 }, (_, i) => <span key={i} style={{ transform: `rotate(${i * 30}deg)` }} />)}
          </div>
          <motion.div className="reveal-ring" initial={{ scale: 0.2, opacity: 1 }} animate={{ scale: 3, opacity: 0 }} transition={{ duration: 1.1, ease: 'easeOut' }} />
          <motion.div className="reveal-ring" initial={{ scale: 0.2, opacity: 1 }} animate={{ scale: 2.4, opacity: 0 }} transition={{ duration: 1.1, delay: 0.35, ease: 'easeOut' }} />
          <motion.div
            className="reveal-card"
            initial={{ scale: 0.3, rotateY: 540, y: 80, opacity: 0 }}
            animate={{ scale: 1, rotateY: 0, y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 90, damping: 14, delay: 0.15 }}
          >
            <MonsterImg image={item.image} size="card" alt={item.name} eager className="h-full w-full" />
            <ElementFX element={item.element} count={28} />
          </motion.div>
          <motion.div className="reveal-copy" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
            <span className="reveal-label"><Sparkles size={16} /> {item.label ?? 'New Monster!'}</span>
            <h2 className="font-display">{item.name}</h2>
            <span className="reveal-meta">
              {ELEMENT_META[item.element].label} · <b>{RARITY_META[item.rarity].label}</b>
            </span>
          </motion.div>
          <button className="reveal-close" aria-label="Close"><X size={18} /></button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
