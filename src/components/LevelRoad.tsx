import { Check, Crown, Lock, Swords } from 'lucide-react';
import { getSpecies, UNLOCKS } from '../game/monsters';
import { playerXpToNext } from '../game/progression';
import { MonsterImg, ProgressBar } from './ui';

/** The summoner level track: every node is a monster that opens up at that level. */
export function LevelRoad({ level, xp, unlocked, onBattle }: { level: number; xp: number; unlocked: Set<string>; onBattle?: () => void }) {
  const need = playerXpToNext(level);
  const next = UNLOCKS.find((u) => u.level > level);
  return (
    <div className="panel overflow-hidden p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-600 font-display text-xl text-white shadow-[0_0_24px_rgba(139,92,246,0.6)]">{level}</div>
          <div>
            <div className="font-bold text-white">Summoner level {level}</div>
            <div className="text-xs text-violet-200/60">
              {next ? (
                <>
                  Next unlock at <b className="text-amber-200">level {next.level}</b> — {getSpecies(next.speciesId)?.name}
                </>
              ) : (
                'Every monster is available to unlock'
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:w-[340px]">
          <div className="flex-1">
            <div className="mb-1 flex justify-between text-[11px] text-violet-200/60">
              <span>XP</span>
              <span className="font-bold text-white">
                {xp} / {need}
              </span>
            </div>
            <ProgressBar value={xp} max={need} height={7} />
          </div>
          {onBattle && (
            <button className="btn btn-ember !px-3 !py-2 text-xs" onClick={onBattle}>
              <Swords size={14} /> Earn XP
            </button>
          )}
        </div>
      </div>

      <div className="-mx-5 mt-5 overflow-x-auto px-5 pb-2">
        <div className="relative flex min-w-max items-start gap-0">
          {UNLOCKS.map((u, i) => {
            const s = getSpecies(u.speciesId)!;
            const reached = level >= u.level;
            const owned = unlocked.has(u.speciesId);
            const prevReached = i === 0 ? true : level >= UNLOCKS[i - 1].level;
            return (
              <div key={u.speciesId} className="flex items-start">
                {i > 0 && <div className={`mt-[30px] h-[3px] w-8 rounded-full sm:w-12 ${reached ? 'bg-gradient-to-r from-violet-500 to-cyan-400' : prevReached ? 'bg-gradient-to-r from-violet-500/60 to-white/10' : 'bg-white/10'}`} />}
                <div className="flex w-[72px] flex-col items-center text-center">
                  <div className={`relative h-[62px] w-[62px] overflow-hidden rounded-2xl border-2 ${owned ? 'border-emerald-400' : reached ? 'border-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.5)]' : 'border-white/15'}`}>
                    <MonsterImg image={s.image} size="thumb" alt={s.name} className={`h-full w-full ${reached ? '' : 'brightness-[0.35] grayscale'}`} />
                    <div className="absolute inset-0 grid place-items-center">
                      {owned ? (
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-400 text-night-950">
                          <Check size={14} />
                        </span>
                      ) : reached ? (
                        <Crown size={18} className="text-amber-200 drop-shadow" />
                      ) : (
                        <Lock size={16} className="text-white/80" />
                      )}
                    </div>
                  </div>
                  <div className={`mt-1.5 text-[11px] font-extrabold ${reached ? 'text-amber-200' : 'text-violet-200/50'}`}>Lv {u.level}</div>
                  <div className="w-full truncate text-[10px] text-violet-200/60">{s.name}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
