import { useState } from 'react';
import { motion } from 'framer-motion';
import { Cloud, Download, ExternalLink, Heart, Loader2, ShoppingBag, Swords, Trash2, Users } from 'lucide-react';
import type { Monster } from '../game/types';
import { ELEMENT_META, STRONG_AGAINST, weakAgainst } from '../game/elements';
import { MAX_MONSTER_LEVEL, monsterStats, monsterXpToNext, power } from '../game/stats';
import { activeAbility } from '../game/rules';
import { useGame } from '../state/GameContext';
import { cloudinaryShareCardUrl } from '../services/cloudinary';
import { shareOrDownloadCard } from '../services/shareCard';
import { ElementBadge, ElementIcon, Modal, MonsterImg, ProgressBar, RarityBadge, STAT_COLORS } from './ui';

const EFFECT_LABEL = { burn: 'Burn', heal: 'Heal', shield: 'Shield', stun: 'Stun', drain: 'Drain', pierce: 'Pierce' };

export function MonsterDetail({ monster, onClose }: { monster: Monster | null; onClose: () => void }) {
  return (
    <Modal open={!!monster} onClose={onClose} wide label={monster ? `${monster.name} details` : 'Monster details'}>
      {monster && <DetailBody uid={monster.uid} fallback={monster} onClose={onClose} />}
    </Modal>
  );
}

function DetailBody({ uid, fallback, onClose }: { uid: string; fallback: Monster; onClose: () => void }) {
  const g = useGame();
  const m = g.player.monsters.find((x) => x.uid === uid) ?? fallback;
  const [sharing, setSharing] = useState(false);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const s = monsterStats(m);
  const ab = activeAbility(m);
  const el = ELEMENT_META[m.element];
  const inTeam = g.player.team.includes(m.uid);
  const form = m.form ?? 0;
  const capped = m.level >= g.levelCap && m.level < MAX_MONSTER_LEVEL;
  const cloudCard = cloudinaryShareCardUrl(m);
  const cloudDownload = cloudinaryShareCardUrl(m, true);

  const share = async () => {
    setSharing(true);
    try {
      const r = await shareOrDownloadCard(m);
      g.toast({ title: r === 'shared' ? 'Card shared!' : 'Card downloaded', body: `${m.name}'s collectible card is ready.`, tone: 'success' });
    } catch (e) {
      g.toast({ title: 'Could not create card', body: (e as Error).message, tone: 'error' });
    } finally {
      setSharing(false);
    }
  };

  const toggleTeam = () => {
    if (inTeam) g.setTeam(g.player.team.filter((t) => t !== m.uid));
    else if (g.player.team.length >= 3) g.toast({ title: 'Team is full', body: 'Remove a monster from your team first (max 3).', tone: 'warning' });
    else g.setTeam([...g.player.team, m.uid]);
  };

  const statRows: [string, number, string][] = [
    ['Health', s.hp, STAT_COLORS.hp],
    ['Attack', s.attack, STAT_COLORS.attack],
    ['Defense', s.defense, STAT_COLORS.defense],
    ['Speed', s.speed, STAT_COLORS.speed],
  ];

  return (
    <div className="grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="relative overflow-hidden md:rounded-l-[1.25rem]" style={{ background: `radial-gradient(circle at 50% 40%, ${el.glow}, transparent 70%)` }}>
        <motion.div initial={{ scale: 1.08, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }} className="mcard m-5 md:m-7" data-rarity={m.rarity}>
          <div className={`mcard-inner ${m.rarity === 'legendary' || m.rarity === 'epic' ? 'foil' : ''}`}>
            <MonsterImg image={m.image} size="full" alt={m.name} eager className="aspect-[3/4] w-full" />
          </div>
        </motion.div>
      </div>

      <div className="flex flex-col gap-5 p-6 md:p-8">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <RarityBadge rarity={m.rarity} />
            <ElementBadge element={m.element} />
            {m.custom && <span className="chip !py-0.5 !text-[10px]">Original creation</span>}
            {m.image.kind === 'cloudinary' && (
              <span className="chip !py-0.5 !text-[10px] !text-cyan-200">
                <Cloud size={11} /> Cloudinary
              </span>
            )}
            {m.image.kind === 'local' && <span className="chip !py-0.5 !text-[10px] !text-amber-200">Stored on this device</span>}
          </div>
          <h2 className="font-display text-4xl tracking-wide text-white">{m.name}</h2>
          <p className="mt-1 text-sm italic text-violet-200/70">“{m.lore}”</p>
        </div>

        <div className="panel-soft p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-bold text-white">Level {m.level}</span>
            <span className="text-violet-200/60">
              {m.level >= MAX_MONSTER_LEVEL ? 'Max level' : `${m.xp} / ${monsterXpToNext(m.level)} XP`} · Power <b className="text-white">{power(m)}</b>
            </span>
          </div>
          <ProgressBar value={m.xp} max={monsterXpToNext(m.level)} />
          {capped && <p className="mt-2 text-[11px] font-semibold text-amber-200/90">Level cap reached (Summoner Lv {g.player.level} + 3). Raise your Summoner level to keep growing.</p>}
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
            <span className={`rounded-full px-2.5 py-1 ${form > 0 ? 'bg-emerald-500/15 text-emerald-200' : form < 0 ? 'bg-red-500/15 text-red-200' : 'bg-white/5 text-violet-200/70'}`}>
              Form {form > 0 ? '+' : ''}
              {form} ({form * 2 > 0 ? '+' : ''}
              {form * 2}% stats)
            </span>
            {m.lastGrade && <span className="rounded-full bg-white/5 px-2.5 py-1 text-violet-100">Last grade: {m.lastGrade}</span>}
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-violet-100">{m.matches ?? 0} matches</span>
            {(['hp', 'attack', 'defense', 'speed'] as const).filter((k) => m.boosts?.[k]).map((k) => (
              <span key={k} className="rounded-full bg-amber-400/15 px-2.5 py-1 text-amber-100">
                {k.toUpperCase()} +{m.boosts[k]}
              </span>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {statRows.map(([label, v, c]) => (
              <div key={label} className="rounded-xl bg-black/25 p-3 text-center">
                <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c }}>
                  {label}
                </div>
                <div className="font-display text-2xl text-white">{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border p-4" style={{ borderColor: `${el.color}40`, background: el.soft }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-white">
              <ElementIcon element={m.element} size={16} /> {ab.name}
              {m.equippedSkill && <span className="rounded bg-amber-400/20 px-1.5 text-[10px] text-amber-100">Learned</span>}
            </div>
            <div className="text-[11px] font-semibold text-violet-100/70">
              Power {ab.power} · {EFFECT_LABEL[ab.effect]} · CD {ab.cooldown}
            </div>
          </div>
          <p className="mt-1 text-sm text-violet-100/80">{ab.description}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-violet-100/70">
            <span>
              Strong vs:{' '}
              {STRONG_AGAINST[m.element].map((e) => (
                <b key={e} className="ml-1" style={{ color: ELEMENT_META[e].color }}>
                  {ELEMENT_META[e].label}
                </b>
              ))}
            </span>
            <span>
              Weak to:{' '}
              {weakAgainst(m.element).map((e) => (
                <b key={e} className="ml-1" style={{ color: ELEMENT_META[e].color }}>
                  {ELEMENT_META[e].label}
                </b>
              ))}
            </span>
            <span>
              <Swords size={11} className="inline" /> {m.wins} wins
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className="btn btn-primary"
            onClick={() => {
              onClose();
              window.location.hash = `/shop?m=${m.uid}`;
            }}
          >
            <ShoppingBag size={16} /> Upgrade &amp; skills
          </button>
          <button className="btn btn-ghost" onClick={toggleTeam}>
            <Users size={16} /> {inTeam ? 'Remove from team' : 'Add to team'}
          </button>
          <button className="btn btn-ghost" onClick={() => g.toggleFavorite(m.uid)} aria-pressed={!!m.favorite}>
            <Heart size={16} className={m.favorite ? 'fill-pink-400 text-pink-400' : ''} /> {m.favorite ? 'Favorited' : 'Favorite'}
          </button>
          <button className="btn btn-ghost" onClick={share} disabled={sharing}>
            {sharing ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Share card
          </button>
        </div>

        {cloudCard && (
          <div className="panel-soft flex flex-wrap items-center justify-between gap-3 p-3 text-xs text-violet-100/80">
            <span className="inline-flex items-center gap-2">
              <Cloud size={14} className="text-cyan-300" /> Cloudinary-composed card (text overlays, smart crop, rarity border)
            </span>
            <span className="flex gap-2">
              <a className="btn btn-ghost !px-3 !py-1.5 !text-xs" href={cloudCard} target="_blank" rel="noreferrer">
                <ExternalLink size={13} /> Open
              </a>
              <a className="btn btn-ghost !px-3 !py-1.5 !text-xs" href={cloudDownload!}>
                <Download size={13} /> Download
              </a>
            </span>
          </div>
        )}

        {m.custom && (
          <div className="mt-auto border-t border-white/5 pt-4">
            {confirmRelease ? (
              <div className="flex flex-wrap items-center gap-2 text-sm text-red-200">
                Release {m.name} forever?
                <button
                  className="btn !bg-red-500/80 !px-3 !py-1.5 text-white"
                  onClick={() => {
                    g.releaseMonster(m.uid);
                    onClose();
                  }}
                >
                  Release
                </button>
                <button className="btn btn-ghost !px-3 !py-1.5" onClick={() => setConfirmRelease(false)}>
                  Keep
                </button>
              </div>
            ) : (
              <button className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-300/70 hover:text-red-300" onClick={() => setConfirmRelease(true)}>
                <Trash2 size={13} /> Release this monster
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
