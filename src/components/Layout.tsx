import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Home, LayoutGrid, ShoppingBag, Sparkles, Swords, Trophy, X } from 'lucide-react';
import { useGame } from '../state/GameContext';
import { playerXpToNext } from '../game/progression';
import { CoinIcon, ProgressBar } from './ui';
import { ElementFX, RevealOverlay } from './fx';
import { BrandLogo } from './Brand';
import { useEffect, useState } from 'react';
import { Music, Volume2, VolumeX } from 'lucide-react';
import { audio, sfx, unlockAudio } from '../services/sound';

/** Global UI sounds: unlock audio on first gesture, click/select sounds on every button and card. */
function useGlobalSounds() {
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      unlockAudio();
      const el = (e.target as HTMLElement)?.closest('button, a, [role="button"], .tcg') as HTMLElement | null;
      if (!el || (el as HTMLButtonElement).disabled) return;
      if (el.classList.contains('tcg') || el.closest('.tcg')) {
        const card = el.closest('.tcg') as HTMLElement;
        if (card?.dataset.selected === 'true') sfx.deselect(); else sfx.select();
      } else sfx.click();
    };
    const onKey = () => unlockAudio();
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('keydown', onKey, { once: true });
    return () => {
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('keydown', onKey);
    };
  }, []);
}

function SoundToggle() {
  const [, force] = useState(0);
  useEffect(() => audio.subscribe(() => force((n) => n + 1)), []);
  return (
    <div className="fixed bottom-24 right-4 z-[55] flex gap-2 lg:bottom-5">
      <button onClick={() => { unlockAudio(); audio.toggleMusic(); }} aria-label={audio.music ? 'Turn music off' : 'Turn music on'} title="Music"
        className={`grid h-10 w-10 place-items-center rounded-full border backdrop-blur-xl transition ${audio.music ? 'border-amber-300/40 bg-amber-500/15 text-amber-200' : 'border-white/10 bg-night-900/80 text-white/40'}`}>
        <Music size={17} />
      </button>
      <button onClick={() => { unlockAudio(); audio.toggleMute(); }} aria-label={audio.muted ? 'Unmute' : 'Mute'} title="Sound"
        className={`grid h-10 w-10 place-items-center rounded-full border backdrop-blur-xl transition ${!audio.muted ? 'border-cyan-300/40 bg-cyan-500/15 text-cyan-200' : 'border-white/10 bg-night-900/80 text-white/40'}`}>
        {audio.muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
      </button>
    </div>
  );
}

function ElementFXLayer() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 embers-layer" aria-hidden>
      <ElementFX element="fire" count={22} />
    </div>
  );
}

export type Screen = 'home' | 'collection' | 'create' | 'battle' | 'shop' | 'profile' | 'guide';

export const NAV: { id: Screen; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Discover', icon: Home },
  { id: 'collection', label: 'Collection', icon: LayoutGrid },
  { id: 'create', label: 'Create', icon: Sparkles },
  { id: 'battle', label: 'Arena', icon: Swords },
  { id: 'shop', label: 'Shop', icon: ShoppingBag },
  { id: 'profile', label: 'Progress', icon: Trophy },
  { id: 'guide', label: 'How to Play', icon: BookOpen },
];
/** Mobile bottom bar shows the five core screens; the others live in the top bar. */
const MOBILE_NAV: Screen[] = ['home', 'collection', 'battle', 'shop', 'profile'];

function Logo() {
  return <BrandLogo />;
}

export function Layout({ screen, go, children }: { screen: Screen; go: (s: Screen) => void; children: ReactNode }) {
  const { player, toasts, dismissToast, dailyAvailable } = useGame();
  const need = playerXpToNext(player.level);
  useGlobalSounds();

  return (
    <div className="app-bg min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col border-r border-violet-400/10 bg-night-950/70 px-4 py-6 backdrop-blur-xl lg:flex">
        <button onClick={() => go('home')} className="px-2 text-left">
          <Logo />
        </button>
        <nav className="mt-10 flex flex-col gap-1.5">
          {NAV.map((n) => {
            const active = n.id === screen;
            return (
              <button
                key={n.id}
                onClick={() => go(n.id)}
                className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-semibold transition ${active ? 'text-white' : 'text-violet-200/60 hover:bg-white/[0.04] hover:text-white'}`}
              >
                {active && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-xl border border-violet-400/30 bg-gradient-to-r from-violet-600/40 to-blue-600/10 shadow-[0_0_24px_-8px_rgba(139,92,246,0.8)]" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                <n.icon size={19} className={`relative ${active ? 'text-cyan-300' : ''}`} />
                <span className="relative">{n.label}</span>
                {n.id === 'home' && dailyAvailable && <span className="relative ml-auto h-2 w-2 rounded-full bg-orange-400 text-orange-400 glow-dot" />}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto panel p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-600 font-display text-lg text-white ring-2 ring-violet-400/40">{player.level}</div>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-white">{player.name}</div>
              <div className="text-[11px] text-violet-200/60">
                {player.xp} / {need} XP
              </div>
            </div>
          </div>
          <ProgressBar value={player.xp} max={need} className="mt-3" height={6} />
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="inline-flex items-center gap-1.5 font-bold text-amber-200">
              <CoinIcon /> {player.coins.toLocaleString()}
            </span>
            <span className="text-[11px] text-violet-200/50">{player.monsters.length} monsters</span>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-violet-400/10 bg-night-950/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <button onClick={() => go('home')}>
          <Logo />
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => go('create')} aria-label="Create monster" className={`grid h-8 w-8 place-items-center rounded-full ${screen === 'create' ? 'bg-cyan-400/20 text-cyan-200' : 'bg-white/5 text-violet-200'}`}>
            <Sparkles size={16} />
          </button>
          <button onClick={() => go('guide')} aria-label="How to play" className={`grid h-8 w-8 place-items-center rounded-full ${screen === 'guide' ? 'bg-cyan-400/20 text-cyan-200' : 'bg-white/5 text-violet-200'}`}>
            <BookOpen size={16} />
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-sm font-bold text-amber-200">
            <CoinIcon size={14} /> {player.coins.toLocaleString()}
          </span>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-600 font-display text-sm text-white">{player.level}</span>
        </div>
      </header>

      <main className="relative pb-28 lg:pb-10 lg:pl-[232px]">
        <AnimatePresence mode="wait">
          <motion.div key={screen} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-3 bottom-3 z-30 flex justify-around rounded-2xl border border-violet-400/15 bg-night-900/90 px-1 py-1.5 shadow-2xl backdrop-blur-xl lg:hidden">
        {NAV.filter((n) => MOBILE_NAV.includes(n.id)).map((n) => {
          const active = n.id === screen;
          const center = n.id === 'battle';
          return (
            <button key={n.id} onClick={() => go(n.id)} className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-bold transition ${active ? 'text-white' : 'text-violet-200/50'}`}>
              {center ? (
                <span className={`-mt-6 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 shadow-[0_8px_24px_-4px_rgba(139,92,246,0.9)] ring-4 ring-night-900 ${active ? 'scale-105' : ''}`}>
                  <n.icon size={22} className="text-white" />
                </span>
              ) : (
                <n.icon size={20} className={active ? 'text-cyan-300' : ''} />
              )}
              {n.label}
              {n.id === 'home' && dailyAvailable && <span className="absolute right-[30%] top-1 h-1.5 w-1.5 rounded-full bg-orange-400" />}
            </button>
          );
        })}
      </nav>

      <RevealOverlay />
      <SoundToggle />
      {/* Ambient rising embers */}
      <ElementFXLayer />

      {/* Toasts */}
      <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2 max-lg:top-16">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-3 pr-2 shadow-2xl backdrop-blur-xl ${
                t.tone === 'error'
                  ? 'border-red-400/30 bg-red-950/80'
                  : t.tone === 'warning'
                    ? 'border-amber-400/30 bg-amber-950/80'
                    : t.tone === 'legendary'
                      ? 'border-amber-300/40 bg-gradient-to-r from-amber-900/80 to-violet-900/80'
                      : t.tone === 'success'
                        ? 'border-emerald-400/25 bg-night-800/90'
                        : 'border-violet-400/25 bg-night-800/90'
              }`}
            >
              {t.image ? <img src={t.image} alt="" className="h-11 w-11 rounded-xl object-cover" /> : <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full glow-dot ${t.tone === 'error' ? 'bg-red-400 text-red-400' : t.tone === 'warning' ? 'bg-amber-400 text-amber-400' : t.tone === 'success' ? 'bg-emerald-400 text-emerald-400' : 'bg-violet-400 text-violet-400'}`} />}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white">{t.title}</div>
                {t.body && <div className="text-xs text-white/70">{t.body}</div>}
              </div>
              <button onClick={() => dismissToast(t.id)} className="rounded-lg p-1 text-white/50 hover:text-white" aria-label="Dismiss">
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
