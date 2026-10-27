import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle, Check, CheckCircle2, Cloud, CloudOff, Dices, HardDrive, ImagePlus, LayoutGrid, Loader2, RefreshCw, Scissors, Sparkles, Swords, Upload, Wand2, X,
} from 'lucide-react';
import type { Screen } from '../components/Layout';
import type { Element, Monster, MonsterImage, Rarity } from '../game/types';
import { ELEMENTS, ELEMENT_META, RARITIES, RARITY_META } from '../game/elements';
import { ELEMENT_ABILITIES, SPECIES } from '../game/monsters';
import { ARCHETYPES, generateStats, RARITY_COST, rollRarity, ROLL_COST, ROLL_ODDS, uid, type Archetype } from '../game/stats';
import { useGame } from '../state/GameContext';
import { MonsterCard } from '../components/MonsterCard';
import { CoinIcon, ElementIcon, MonsterImg, Particles, RarityBadge, STAT_COLORS } from '../components/ui';
import { cloudinaryConfigured, cloudinaryUrl, fileToCardDataUrl, uploadImage, validateImage, type UploadHandle } from '../services/cloudinary';

type Source = { kind: 'none' } | { kind: 'file'; file: File; previewUrl: string } | { kind: 'existing'; image: MonsterImage; label: string };
type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; progress: number }
  | { status: 'done'; publicId: string; version: number }
  | { status: 'error'; error: string }
  | { status: 'local' };

const NAME_IDEAS = ['Glimmerjaw', 'Snarlwick', 'Frostbyte', 'Mirewing', 'Cinderpaw', 'Lumifang', 'Thistlebrute', 'Vortexi', 'Gloomhorn', 'Sparkmane'];

export function CreateScreen({ go }: { go: (s: Screen) => void }) {
  const g = useGame();
  const p = g.player;
  const fileInput = useRef<HTMLInputElement>(null);
  const handle = useRef<UploadHandle | null>(null);

  const [source, setSource] = useState<Source>({ kind: 'none' });
  const [upload, setUpload] = useState<UploadState>({ status: 'idle' });
  const [localData, setLocalData] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [showGallery, setShowGallery] = useState(false);

  const [name, setName] = useState('');
  const [element, setElement] = useState<Element>('fire');
  const [archetype, setArchetype] = useState<Archetype>('balanced');
  const [abilityIdx, setAbilityIdx] = useState(0);
  const [rarity, setRarity] = useState<Rarity>('common');
  const [rolled, setRolled] = useState<Rarity | null>(null);
  const [rolling, setRolling] = useState(false);
  const [removeBg, setRemoveBg] = useState(false);
  const [lore, setLore] = useState('');
  const [created, setCreated] = useState<Monster | null>(null);

  useEffect(() => () => handle.current?.abort(), []);
  useEffect(() => () => (source.kind === 'file' ? URL.revokeObjectURL(source.previewUrl) : undefined), [source]);

  const startUpload = (file: File) => {
    handle.current?.abort();
    if (!cloudinaryConfigured) {
      setUpload({ status: 'local' });
      return;
    }
    setUpload({ status: 'uploading', progress: 0 });
    const h = uploadImage(file, (progress) => setUpload({ status: 'uploading', progress }));
    handle.current = h;
    h.promise
      .then((r) => {
        if (handle.current !== h) return;
        setUpload({ status: 'done', publicId: r.publicId, version: r.version });
        g.recordUpload(r.publicId);
      })
      .catch((e: Error) => {
        if (handle.current !== h) return;
        setUpload({ status: 'error', error: e.message });
      });
  };

  const onFile = async (file?: File | null) => {
    if (!file) return;
    const err = validateImage(file);
    if (err) {
      setFileError(err);
      return;
    }
    setFileError(null);
    setShowGallery(false);
    setSource({ kind: 'file', file, previewUrl: URL.createObjectURL(file) });
    setLocalData(null);
    fileToCardDataUrl(file)
      .then(setLocalData)
      .catch(() => setFileError('We could not read that image. Try another file.'));
    startUpload(file);
    if (!name) setName(file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 18));
  };

  const pickExisting = (image: MonsterImage, label: string) => {
    handle.current?.abort();
    handle.current = null;
    setSource({ kind: 'existing', image, label });
    setUpload({ status: 'idle' });
    setFileError(null);
    setShowGallery(false);
  };

  const clearImage = () => {
    handle.current?.abort();
    handle.current = null;
    setSource({ kind: 'none' });
    setUpload({ status: 'idle' });
    setLocalData(null);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    onFile(e.dataTransfer.files?.[0]);
  };

  // —— Derived image for the card ——
  const cardImage: MonsterImage | null = useMemo(() => {
    if (source.kind === 'existing') {
      if (source.image.kind === 'cloudinary') return { ...source.image, removeBg };
      return source.image;
    }
    if (source.kind === 'file') {
      if (upload.status === 'done') return { kind: 'cloudinary', publicId: upload.publicId, version: upload.version, removeBg };
      return { kind: 'local', dataUrl: localData ?? source.previewUrl };
    }
    return null;
  }, [source, upload, localData, removeBg]);

  const isCloud = cardImage?.kind === 'cloudinary';
  const abilities = ELEMENT_ABILITIES[element];
  const ability = abilities[abilityIdx] ?? abilities[0];
  const stats = generateStats(element, rarity, archetype, name);
  const cost = rolled === rarity ? 0 : RARITY_COST[rarity];
  const trimmed = name.trim();

  const blocker =
    !cardImage ? 'Add an image to continue'
    : upload.status === 'uploading' ? 'Waiting for upload to finish…'
    : source.kind === 'file' && !localData && upload.status !== 'done' ? 'Preparing image…'
    : trimmed.length < 2 ? 'Give your monster a name'
    : p.coins < cost ? `You need ${cost} coins for ${RARITY_META[rarity].label}`
    : null;

  const draft: Monster = {
    uid: 'draft',
    speciesId: null,
    name: trimmed || 'Unnamed',
    element,
    rarity,
    level: 1,
    xp: 0,
    base: stats,
    ability,
    lore: lore.trim() || `A ${RARITY_META[rarity].label.toLowerCase()} ${ELEMENT_META[element].label.toLowerCase()} monster, forged in the MAYHEM studio.`,
    image: cardImage ?? { kind: 'bundled', path: '/monsters/emberclaw.webp' },
    custom: true,
    createdAt: Date.now(),
    wins: 0,
    form: 0,
    boosts: { hp: 0, attack: 0, defense: 0, speed: 0 },
    skills: [],
    equippedSkill: null,
    matches: 0,
    lastGrade: null,
  };

  const roll = () => {
    if (rolling) return;
    if (!g.spendCoins(ROLL_COST)) {
      g.toast({ title: 'Not enough coins', body: `A rarity roll costs ${ROLL_COST} coins.`, tone: 'warning' });
      return;
    }
    setRolling(true);
    let i = 0;
    const iv = setInterval(() => {
      setRarity(RARITIES[i++ % 4]);
    }, 90);
    setTimeout(() => {
      clearInterval(iv);
      const r = rollRarity();
      setRarity(r);
      setRolled(r);
      setRolling(false);
      g.toast({ title: `You rolled ${RARITY_META[r].label}!`, body: r === 'common' ? 'Better luck next time.' : 'Your monster will carry this rarity for free.', tone: r === 'legendary' ? 'legendary' : r === 'common' ? 'info' : 'success' });
    }, 1300);
  };

  const save = () => {
    if (blocker || !cardImage) return;
    let image = cardImage;
    if (image.kind === 'local' && localData) image = { kind: 'local', dataUrl: localData };
    const m: Monster = { ...draft, uid: uid(), image, createdAt: Date.now() };
    if (!g.addCustomMonster(m, cost)) {
      g.toast({ title: 'Not enough coins', tone: 'warning' });
      return;
    }
    setCreated(m);
    if (rolled === rarity) setRolled(null);
  };

  const reset = () => {
    setCreated(null);
    clearImage();
    setName('');
    setLore('');
    setRarity('common');
    setRolled(null);
    setRemoveBg(false);
  };

  const recentUploads = p.uploads.slice(0, 8);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300/80">Creation studio</div>
          <h1 className="font-display text-4xl tracking-wide text-white sm:text-5xl">Create Monster</h1>
          <p className="mt-1 text-violet-200/70">Upload any image and forge it into a battle-ready collectible.</p>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${cloudinaryConfigured ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200' : 'border-amber-300/30 bg-amber-300/10 text-amber-200'}`}>
          {cloudinaryConfigured ? <Cloud size={14} /> : <CloudOff size={14} />}
          {cloudinaryConfigured ? 'Cloudinary connected' : 'Cloudinary not configured · local mode'}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.15fr_minmax(300px,0.8fr)]">
        {/* STEP 1 — IMAGE */}
        <section className="panel p-5">
          <StepTitle n={1} title="Artwork" />
          {source.kind === 'none' ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInput.current?.click()}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInput.current?.click()}
              role="button"
              tabIndex={0}
              className={`relative grid aspect-[3/4] cursor-pointer place-items-center overflow-hidden rounded-2xl border-2 border-dashed p-6 text-center transition ${dragging ? 'border-cyan-300 bg-cyan-300/10' : 'border-violet-400/30 bg-violet-500/[0.04] hover:border-violet-400/60 hover:bg-violet-500/[0.08]'}`}
            >
              <Particles count={10} />
              <div className="relative">
                <motion.div animate={{ y: dragging ? -6 : 0 }} className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 shadow-[0_0_40px_rgba(139,92,246,0.6)]">
                  <ImagePlus size={28} className="text-white" />
                </motion.div>
                <div className="font-display text-xl text-white">{dragging ? 'Release to summon' : 'Drop an image here'}</div>
                <div className="mt-1 text-sm text-violet-200/70">or click to browse</div>
                <div className="mt-4 text-[11px] text-violet-200/50">JPG, PNG, WEBP or GIF · up to 10 MB</div>
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-2xl border border-white/10">
              {source.kind === 'file' ? (
                <img src={source.previewUrl} alt="Your upload preview" className="aspect-[3/4] w-full object-cover" />
              ) : (
                <MonsterImg image={source.image} size="card" alt={source.label} className="aspect-[3/4] w-full" eager />
              )}
              <button onClick={clearImage} className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80" aria-label="Remove image">
                <X size={16} />
              </button>
              {upload.status === 'uploading' && (
                <div className="absolute inset-0 grid place-items-center bg-night-950/70 backdrop-blur-sm">
                  <div className="w-3/4 text-center">
                    <Loader2 className="mx-auto mb-3 animate-spin text-cyan-300" size={30} />
                    <div className="mb-2 text-sm font-bold text-white">Uploading to Cloudinary… {upload.progress}%</div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all" style={{ width: `${upload.progress}%` }} />
                    </div>
                    <button className="mt-3 text-xs font-semibold text-violet-200/70 hover:text-white" onClick={clearImage}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = '';
          }} />

          {fileError && (
            <div role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {fileError}
            </div>
          )}

          {/* Upload status */}
          {source.kind === 'file' && <UploadStatus upload={upload} onRetry={() => startUpload(source.file)} />}
          {source.kind === 'existing' && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-violet-100/80">
              <Check size={14} className="text-emerald-300" /> Using {source.label}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button className="btn btn-ghost flex-1 !py-2 text-sm" onClick={() => fileInput.current?.click()}>
              <Upload size={15} /> {source.kind === 'none' ? 'Upload' : 'Replace'}
            </button>
            <button className="btn btn-ghost flex-1 !py-2 text-sm" onClick={() => setShowGallery((v) => !v)} aria-expanded={showGallery}>
              <LayoutGrid size={15} /> Existing
            </button>
          </div>

          <AnimatePresence>
            {showGallery && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                {recentUploads.length > 0 && (
                  <>
                    <div className="mb-2 mt-4 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-cyan-300/80">
                      <Cloud size={12} /> Your Cloudinary uploads
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {recentUploads.map((u) => (
                        <button key={u.publicId} onClick={() => pickExisting({ kind: 'cloudinary', publicId: u.publicId }, 'a previous Cloudinary upload')} className="overflow-hidden rounded-lg border border-white/10 hover:border-cyan-300/60">
                          <img src={cloudinaryUrl(u.publicId, 'thumb')} alt="Previous upload" loading="lazy" className="aspect-[3/4] w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <div className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wider text-violet-200/60">Studio artwork</div>
                <div className="grid grid-cols-4 gap-2">
                  {SPECIES.map((s) => (
                    <button key={s.id} onClick={() => pickExisting(s.image, `${s.name}'s artwork`)} className="overflow-hidden rounded-lg border border-white/10 hover:border-violet-400/60" title={s.name}>
                      <MonsterImg image={s.image} size="thumb" alt={s.name} className="aspect-[3/4] w-full" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isCloud && (
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.05] p-3">
              <input type="checkbox" className="mt-1 accent-cyan-400" checked={removeBg} onChange={(e) => setRemoveBg(e.target.checked)} />
              <span className="text-xs text-violet-100/80">
                <span className="flex items-center gap-1.5 font-bold text-white">
                  <Scissors size={13} /> AI background removal
                </span>
                Uses Cloudinary <code className="text-cyan-200">e_background_removal</code>. Requires the AI Background Removal add-on — falls back to the original image if unavailable.
              </span>
            </label>
          )}
        </section>

        {/* STEP 2 — IDENTITY */}
        <section className="panel space-y-6 p-5">
          <div>
            <StepTitle n={2} title="Identity" />
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-violet-200/60" htmlFor="mname">
              Monster name
            </label>
            <div className="flex gap-2">
              <input id="mname" className="input" maxLength={18} placeholder="e.g. Glimmerjaw" value={name} onChange={(e) => setName(e.target.value)} />
              <button className="btn btn-ghost !px-3" title="Suggest a name" aria-label="Suggest a name" onClick={() => setName(NAME_IDEAS[Math.floor(Math.random() * NAME_IDEAS.length)])}>
                <Wand2 size={16} />
              </button>
            </div>
            <div className="mt-1 text-right text-[10px] text-violet-200/40">{name.length}/18</div>
          </div>

          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-violet-200/60">Element</div>
            <div className="grid grid-cols-3 gap-2">
              {ELEMENTS.map((e) => {
                const active = e === element;
                const meta = ELEMENT_META[e];
                return (
                  <button
                    key={e}
                    onClick={() => {
                      setElement(e);
                      setAbilityIdx(0);
                    }}
                    aria-pressed={active}
                    className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition"
                    style={{ borderColor: active ? meta.color : 'rgba(255,255,255,0.08)', background: active ? meta.soft : 'rgba(255,255,255,0.02)', color: active ? 'white' : '#c4b5fd', boxShadow: active ? `0 0 20px -6px ${meta.glow}` : undefined }}
                  >
                    <ElementIcon element={e} size={16} /> {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-violet-200/60">Battle style</div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(ARCHETYPES) as Archetype[]).map((a) => (
                <button key={a} onClick={() => setArchetype(a)} aria-pressed={a === archetype} className={`rounded-xl border p-3 text-left transition ${a === archetype ? 'border-violet-400/70 bg-violet-500/15' : 'border-white/[0.08] bg-white/[0.02] hover:border-violet-400/30'}`}>
                  <div className="text-sm font-bold text-white">{ARCHETYPES[a].label}</div>
                  <div className="text-[11px] text-violet-200/60">{ARCHETYPES[a].blurb}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-violet-200/60">Special ability</div>
            <div className="space-y-2">
              {abilities.map((ab, i) => (
                <button key={ab.name} onClick={() => setAbilityIdx(i)} aria-pressed={i === abilityIdx} className={`w-full rounded-xl border p-3 text-left transition ${i === abilityIdx ? 'border-violet-400/70 bg-violet-500/15' : 'border-white/[0.08] bg-white/[0.02] hover:border-violet-400/30'}`}>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm font-bold text-white">
                      <ElementIcon element={element} /> {ab.name}
                    </span>
                    <span className="text-[10px] font-bold text-violet-200/60">PWR {ab.power}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-violet-200/70">{ab.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-violet-200/60">Rarity</span>
              <button className="btn btn-ember !px-3 !py-1.5 text-xs" onClick={roll} disabled={rolling || p.coins < ROLL_COST}>
                {rolling ? <Loader2 size={13} className="animate-spin" /> : <Dices size={13} />} Roll · <CoinIcon size={11} /> {ROLL_COST}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {RARITIES.map((r) => {
                const free = rolled === r;
                const c = free ? 0 : RARITY_COST[r];
                const active = r === rarity;
                return (
                  <button key={r} disabled={rolling} onClick={() => setRarity(r)} aria-pressed={active} className="relative rounded-xl border p-2.5 text-center transition" style={{ borderColor: active ? RARITY_META[r].color : 'rgba(255,255,255,0.08)', background: active ? `${RARITY_META[r].color}1c` : 'rgba(255,255,255,0.02)', boxShadow: active ? `0 0 22px -8px ${RARITY_META[r].color}` : undefined }}>
                    <div className="text-xs font-extrabold" style={{ color: RARITY_META[r].color }}>
                      {RARITY_META[r].label}
                    </div>
                    <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-white/80">
                      {c === 0 ? (free ? 'Rolled ✓' : 'Free') : (
                        <>
                          <CoinIcon size={11} /> {c}
                        </>
                      )}
                    </div>
                    <div className="text-[9px] text-violet-200/40">{Math.round(ROLL_ODDS[r] * 100)}% roll</div>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-violet-200/50">Pick a rarity directly, or roll for a chance at a higher tier. Rarity multiplies base stats (×{RARITY_META[rarity].statMult}).</p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-violet-200/60" htmlFor="mlore">
              Lore <span className="normal-case text-violet-200/40">(optional)</span>
            </label>
            <textarea id="mlore" className="input min-h-[70px] resize-none" maxLength={120} placeholder="Where did your monster come from?" value={lore} onChange={(e) => setLore(e.target.value)} />
          </div>
        </section>

        {/* STEP 3 — PREVIEW */}
        <section className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <div className="panel p-5">
            <StepTitle n={3} title="Card preview" />
            <div className="mx-auto max-w-[300px]">
              {cardImage ? (
                <MonsterCard monster={draft} size="lg" eager />
              ) : (
                <div className="mcard" data-rarity={rarity} style={{ aspectRatio: '5 / 7.4' }}>
                  <div className="mcard-inner grid place-items-center p-6 text-center">
                    <div>
                      <Sparkles className="mx-auto mb-3 text-violet-300/60" size={30} />
                      <div className="font-display text-lg text-white/80">Your card appears here</div>
                      <div className="mt-1 text-xs text-violet-200/50">Add artwork to begin</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 grid grid-cols-4 gap-2">
              {(
                [
                  ['HP', stats.hp, STAT_COLORS.hp],
                  ['ATK', stats.attack, STAT_COLORS.attack],
                  ['DEF', stats.defense, STAT_COLORS.defense],
                  ['SPD', stats.speed, STAT_COLORS.speed],
                ] as const
              ).map(([l, v, c]) => (
                <div key={l} className="rounded-xl bg-black/25 p-2 text-center">
                  <div className="text-[9px] font-bold" style={{ color: c }}>
                    {l}
                  </div>
                  <motion.div key={v} initial={{ scale: 1.3, color: '#22d3ee' }} animate={{ scale: 1, color: '#ffffff' }} className="font-display text-lg">
                    {v}
                  </motion.div>
                </div>
              ))}
            </div>

            {isCloud && cardImage?.kind === 'cloudinary' && (
              <div className="mt-4 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.04] p-3">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-cyan-200">
                  <Cloud size={12} /> Cloudinary transformations
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['f_auto', 'q_auto', 'c_fill', 'g_auto', 'w_600,h_800', ...(removeBg ? ['e_background_removal'] : [])].map((t) => (
                    <code key={t} className="rounded-md bg-black/30 px-1.5 py-0.5 text-[10px] text-cyan-100">
                      {t}
                    </code>
                  ))}
                </div>
              </div>
            )}

            <button className="btn btn-primary mt-5 w-full py-3.5 text-base" disabled={!!blocker} onClick={save}>
              <Sparkles size={18} /> Forge monster
              {cost > 0 && (
                <span className="inline-flex items-center gap-1 rounded-md bg-black/25 px-2 py-0.5 text-sm">
                  <CoinIcon size={13} /> {cost}
                </span>
              )}
            </button>
            {blocker && <p className="mt-2 text-center text-xs text-violet-200/60">{blocker}</p>}
            {!blocker && cardImage?.kind === 'local' && (
              <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-amber-200/80">
                <HardDrive size={12} /> Artwork will be saved on this device only
              </p>
            )}
          </div>
        </section>
      </div>

      <AnimatePresence>{created && <CreatedOverlay monster={created} onAnother={reset} onCollection={() => go('collection')} onBattle={() => go('battle')} />}</AnimatePresence>
    </div>
  );
}

function StepTitle({ n, title }: { n: number; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-blue-600 text-xs font-extrabold text-white">{n}</span>
      <h2 className="font-display text-xl tracking-wide text-white">{title}</h2>
    </div>
  );
}

function UploadStatus({ upload, onRetry }: { upload: UploadState; onRetry: () => void }) {
  if (upload.status === 'done')
    return (
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3 text-xs text-emerald-100">
        <CheckCircle2 size={15} className="shrink-0 text-emerald-300" />
        <span>
          Uploaded to Cloudinary · <code className="text-emerald-200/80">{upload.publicId.split('/').pop()}</code>
        </span>
      </div>
    );
  if (upload.status === 'error')
    return (
      <div role="alert" className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-100">
        <div className="flex items-start gap-2">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-red-300" />
          <div className="flex-1">
            <div className="font-bold">Upload failed — image not stored in Cloudinary</div>
            <div className="text-red-100/80">{upload.error}</div>
            <div className="mt-1 text-red-100/60">You can retry, or continue with a local copy saved on this device.</div>
          </div>
        </div>
        <button className="btn btn-ghost mt-2 !px-3 !py-1.5 text-xs" onClick={onRetry}>
          <RefreshCw size={13} /> Retry upload
        </button>
      </div>
    );
  if (upload.status === 'local')
    return (
      <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 text-xs text-amber-100">
        <HardDrive size={15} className="mt-0.5 shrink-0 text-amber-300" />
        <span>
          Cloudinary isn’t configured, so this image stays on your device (cropped to 3:4 and compressed). Add <code>VITE_CLOUDINARY_CLOUD_NAME</code> and <code>VITE_CLOUDINARY_UPLOAD_PRESET</code> to enable cloud uploads.
        </span>
      </div>
    );
  return null;
}

function CreatedOverlay({ monster, onAnother, onCollection, onBattle }: { monster: Monster; onAnother: () => void; onCollection: () => void; onBattle: () => void }) {
  const legendary = monster.rarity === 'legendary';
  return (
    <motion.div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-night-950/90 p-6 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60"
        style={{ background: `conic-gradient(from 0deg, transparent, ${RARITY_META[monster.rarity].color}55, transparent 20%, transparent 50%, ${ELEMENT_META[monster.element].color}55, transparent 70%)` }}
        animate={{ rotate: 360 }}
        transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
      />
      <Particles count={40} color={RARITY_META[monster.rarity].color} />
      <div className="relative flex flex-col items-center text-center">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
          A new monster is born
        </motion.div>
        <motion.h2 initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, type: 'spring' }} className="mb-6 font-display text-5xl text-white drop-shadow-[0_0_30px_rgba(168,85,247,0.8)]">
          {monster.name}
        </motion.h2>
        <motion.div initial={{ rotateY: 180, scale: 0.6, opacity: 0 }} animate={{ rotateY: 0, scale: 1, opacity: 1 }} transition={{ delay: 0.45, duration: 0.9, type: 'spring', damping: 14 }} style={{ perspective: 1000 }} className="w-[270px]">
          <MonsterCard monster={monster} size="lg" eager />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }} className="mt-5 flex items-center gap-2">
          <RarityBadge rarity={monster.rarity} />
          <span className="text-sm text-violet-200/70">{legendary ? 'A legend has entered your collection!' : 'Added to your collection'}</span>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.25 }} className="mt-6 flex flex-wrap justify-center gap-2">
          <button className="btn btn-ember" onClick={onBattle}>
            <Swords size={16} /> Take it to the arena
          </button>
          <button className="btn btn-ghost" onClick={onCollection}>
            <LayoutGrid size={16} /> View collection
          </button>
          <button className="btn btn-ghost" onClick={onAnother}>
            <Sparkles size={16} /> Create another
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
