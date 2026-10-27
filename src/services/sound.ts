/**
 * Procedural audio engine (Web Audio API) — no asset files needed.
 * SFX are synthesized; music is a looping war-drum + brass score with two moods: 'menu' and 'battle'.
 */
import type { Element } from '../game/types';

type Mood = 'menu' | 'battle' | 'off';
const KEY = 'monstersnap:audio';

let ctx: AudioContext | null = null;
let master: GainNode, sfxBus: GainNode, musicBus: GainNode, verb: ConvolverNode;
let noiseBuf: AudioBuffer;
const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } })();
let muted: boolean = saved.muted ?? false;
let musicOn: boolean = saved.music ?? true;
let mood: Mood = 'menu';
let timer: number | undefined;
let nextBeat = 0;
let step = 0;
const listeners = new Set<() => void>();

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify({ muted, music: musicOn })); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

function init() {
  if (ctx) return ctx;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.8;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  master.connect(comp).connect(ctx.destination);
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
  musicBus = ctx.createGain(); musicBus.gain.value = musicOn ? 0.32 : 0; musicBus.connect(master);
  // noise buffer
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // simple reverb impulse
  verb = ctx.createConvolver();
  const len = ctx.sampleRate * 2.2;
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const ch = ir.getChannelData(c);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  verb.buffer = ir;
  const wet = ctx.createGain(); wet.gain.value = 0.25;
  verb.connect(wet).connect(master);
  return ctx;
}

/** Call on first user gesture (browsers block audio before that). */
export function unlockAudio() {
  const c = init();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();
  if (timer === undefined) startScheduler();
}

/* ---------------- primitives ---------------- */
const now = () => ctx!.currentTime;

function env(g: GainNode, t: number, a: number, peak: number, d: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}

function tone(freq: number, dur: number, opts: { type?: OscillatorType; vol?: number; slide?: number; t?: number; bus?: AudioNode; attack?: number; reverb?: boolean } = {}) {
  if (!ctx) return;
  const t = opts.t ?? now();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = opts.type ?? 'sine';
  o.frequency.setValueAtTime(freq, t);
  if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slide), t + dur);
  env(g, t, opts.attack ?? 0.005, opts.vol ?? 0.3, dur);
  o.connect(g).connect(opts.bus ?? sfxBus);
  if (opts.reverb) g.connect(verb);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur: number, opts: { vol?: number; t?: number; filter?: BiquadFilterType; freq?: number; sweep?: number; q?: number; bus?: AudioNode; reverb?: boolean } = {}) {
  if (!ctx) return;
  const t = opts.t ?? now();
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = opts.filter ?? 'lowpass';
  f.frequency.setValueAtTime(opts.freq ?? 2000, t);
  if (opts.sweep) f.frequency.exponentialRampToValueAtTime(opts.sweep, t + dur);
  f.Q.value = opts.q ?? 1;
  const g = ctx.createGain();
  env(g, t, 0.004, opts.vol ?? 0.3, dur);
  s.connect(f).connect(g).connect(opts.bus ?? sfxBus);
  if (opts.reverb) g.connect(verb);
  s.start(t, Math.random());
  s.stop(t + dur + 0.05);
}

const ok = () => !!ctx && !muted;

/* ---------------- SFX ---------------- */
export const sfx = {
  click() { if (!ok()) return; tone(900, 0.05, { type: 'triangle', vol: 0.12, slide: 600 }); },
  hover() { if (!ok()) return; tone(1400, 0.03, { type: 'sine', vol: 0.04 }); },
  select() {
    if (!ok()) return;
    const t = now();
    [523, 784, 1047].forEach((f, i) => tone(f, 0.18, { type: 'triangle', vol: 0.14, t: t + i * 0.05, reverb: true }));
    noise(0.15, { filter: 'highpass', freq: 5000, vol: 0.05, t });
  },
  deselect() { if (!ok()) return; tone(600, 0.1, { type: 'triangle', vol: 0.1, slide: 300 }); },
  whoosh() { if (!ok()) return; noise(0.25, { filter: 'bandpass', freq: 600, sweep: 3500, q: 2, vol: 0.25 }); },
  /** Basic attack: blade swing whoosh + metallic swish + small element tint. */
  attack(el?: Element) {
    if (!ok()) return;
    const t = now();
    noise(0.22, { filter: 'bandpass', freq: 500, sweep: 4500, q: 3, vol: 0.4, t });
    noise(0.12, { filter: 'highpass', freq: 6000, vol: 0.12, t: t + 0.1 });
    tone(2400, 0.12, { type: 'triangle', vol: 0.05, slide: 1200, t: t + 0.1 });
    if (el) elementLayer(el, 0.4);
  },
  hit(crit = false, superEff = false) {
    if (!ok()) return;
    const t = now();
    tone(crit ? 90 : 120, 0.25, { type: 'sine', vol: 0.7, slide: 40 });
    noise(0.12, { filter: 'lowpass', freq: 4000, sweep: 300, vol: 0.5, t });
    tone(220, 0.08, { type: 'square', vol: 0.12, slide: 80, t });
    if (crit || superEff) {
      noise(0.4, { filter: 'highpass', freq: 2500, vol: 0.18, t: t + 0.02, reverb: true });
      tone(1760, 0.3, { type: 'triangle', vol: 0.1, t: t + 0.04, slide: 880, reverb: true });
    }
  },
  /** Special: magical power charge (rising arpeggio + swelling choir) then an explosive release. */
  special(el: Element) {
    if (!ok()) return;
    const t = now();
    // charge-up
    tone(110, 0.55, { type: 'sawtooth', vol: 0.16, slide: 880, t, attack: 0.2 });
    tone(165, 0.55, { type: 'sawtooth', vol: 0.1, slide: 1320, t, attack: 0.2 });
    [440, 554, 659, 880, 1109, 1319].forEach((f, i) => tone(f, 0.12, { type: 'sine', vol: 0.08, t: t + i * 0.06, reverb: true }));
    noise(0.5, { filter: 'bandpass', freq: 200, sweep: 6000, q: 4, vol: 0.2, t });
    // release boom
    const r = t + 0.38;
    tone(60, 0.9, { type: 'sine', vol: 0.7, slide: 28, t: r });
    noise(0.7, { filter: 'lowpass', freq: 5000, sweep: 200, vol: 0.45, t: r, reverb: true });
    [220, 277, 330, 440].forEach((f) => tone(f, 1.0, { type: 'triangle', vol: 0.07, t: r, reverb: true }));
    setTimeout(() => { if (ok()) elementLayer(el, 1.1); }, 380);
  },
  heal() {
    if (!ok()) return;
    const t = now();
    [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.4, { type: 'sine', vol: 0.12, t: t + i * 0.07, reverb: true }));
  },
  /** Defend: heavy metal shield slam + ringing clang + shimmering barrier hum. */
  defend() {
    if (!ok()) return;
    const t = now();
    tone(140, 0.2, { type: 'sine', vol: 0.6, slide: 60, t });
    noise(0.08, { filter: 'bandpass', freq: 2500, q: 2, vol: 0.4, t });
    // metallic ring: inharmonic partials
    [523, 1187, 1873, 2711, 3540].forEach((f, i) => tone(f, 1.1 - i * 0.15, { type: 'sine', vol: 0.09 / (i * 0.5 + 1), t: t + 0.01, reverb: true }));
    // energy barrier
    tone(220, 0.8, { type: 'sawtooth', vol: 0.05, slide: 330, t: t + 0.1, attack: 0.15 });
    noise(0.6, { filter: 'bandpass', freq: 4000, q: 8, vol: 0.06, t: t + 0.1 });
  },
  /** Hit absorbed by a raised shield. */
  block() {
    if (!ok()) return;
    const t = now();
    [700, 1500, 2300].forEach((f) => tone(f, 0.4, { type: 'square', vol: 0.04, t, reverb: true }));
    noise(0.1, { filter: 'highpass', freq: 2000, vol: 0.3, t });
  },
  /** Thunder strike when a monster is switched in. */
  thunder() {
    if (!ok()) return;
    const t = now();
    // crack
    noise(0.12, { filter: 'highpass', freq: 1500, vol: 0.7, t });
    for (let i = 0; i < 5; i++) noise(0.03, { filter: 'highpass', freq: 3000, vol: 0.4, t: t + 0.04 + i * 0.03 });
    tone(1800, 0.15, { type: 'square', vol: 0.08, slide: 200, t });
    // rolling rumble
    noise(2.4, { filter: 'lowpass', freq: 900, sweep: 60, vol: 0.6, t: t + 0.05, reverb: true });
    tone(45, 1.8, { type: 'sine', vol: 0.5, slide: 30, t: t + 0.05 });
    noise(1.2, { filter: 'lowpass', freq: 300, vol: 0.35, t: t + 0.6, reverb: true });
  },
  faint() {
    if (!ok()) return;
    tone(300, 0.9, { type: 'sawtooth', vol: 0.15, slide: 50 });
    noise(0.8, { filter: 'lowpass', freq: 800, sweep: 100, vol: 0.2 });
  },
  switchIn() { sfx.thunder(); },
  coin() { if (!ok()) return; const t = now(); tone(988, 0.08, { type: 'square', vol: 0.08, t }); tone(1319, 0.25, { type: 'square', vol: 0.08, t: t + 0.07 }); },
  gong() {
    if (!ok()) return;
    const t = now();
    [98, 147, 196, 277].forEach((f, i) => tone(f, 2.4, { type: 'sine', vol: 0.25 / (i + 1), t, reverb: true }));
    noise(0.5, { filter: 'lowpass', freq: 1500, sweep: 200, vol: 0.3, t, reverb: true });
  },
  /** Fight begins: 3-beat countdown, war horn blast, thunder, then a sword-clash + drum barrage. */
  fight() {
    if (!ok()) return;
    const t = now();
    // countdown ticks (3, 2, 1)
    [0, 0.45, 0.9].forEach((d, i) => {
      drum(t + d, 0.9);
      tone(i === 2 ? 880 : 660, 0.18, { type: 'square', vol: 0.09, t: t + d });
    });
    // war horn
    const h = t + 1.35;
    [146.8, 220, 293.7].forEach((f) => brass(f, 1.3, h, 0.13));
    brass(293.7, 0.3, h + 1.0, 0.12);
    brass(440, 0.9, h + 1.25, 0.14);
    // thunder + sword clash
    setTimeout(() => sfx.thunder(), 1350);
    [1240, 1870, 2650, 3410].forEach((f) => tone(f, 0.7, { type: 'sine', vol: 0.06, t: h + 0.02, reverb: true }));
    noise(0.15, { filter: 'highpass', freq: 3500, vol: 0.35, t: h });
    // drum barrage
    for (let i = 0; i < 8; i++) drum(h + 1.25 + i * 0.09, 0.5 + i * 0.07);
  },
  victory() {
    if (!ok()) return;
    const t = now();
    const notes = [392, 523, 659, 784, 659, 784, 1047];
    const times = [0, 0.15, 0.3, 0.45, 0.7, 0.85, 1.05];
    notes.forEach((f, i) => {
      brass(f, i === notes.length - 1 ? 1.4 : 0.22, t + times[i]);
    });
    [0, 0.45, 1.05].forEach((d) => drum(t + d, 1));
    noise(1.5, { filter: 'highpass', freq: 6000, vol: 0.06, t: t + 1.05, reverb: true });
  },
  defeat() {
    if (!ok()) return;
    const t = now();
    [392, 370, 349, 262].forEach((f, i) => brass(f, i === 3 ? 1.6 : 0.4, t + i * 0.42, 0.12));
    drum(t, 0.8); drum(t + 1.26, 1);
  },
  reveal() {
    if (!ok()) return;
    const t = now();
    noise(1.2, { filter: 'bandpass', freq: 200, sweep: 8000, q: 2, vol: 0.25, t });
    tone(80, 1.2, { type: 'sawtooth', vol: 0.12, slide: 640, t, attack: 0.4 });
    const chord = [523, 659, 784, 1047, 1319];
    chord.forEach((f, i) => tone(f, 1.8, { type: 'triangle', vol: 0.1, t: t + 1.0 + i * 0.04, reverb: true }));
    drum(t + 1.0, 1.2);
    sfx.coin();
  },
  /** Reward claim: treasure chest pop + cascading coin shower + bright "got it" chord. */
  reward() {
    if (!ok()) return;
    const t = now();
    tone(180, 0.15, { type: 'sine', vol: 0.5, slide: 90, t }); // chest thump
    noise(0.1, { filter: 'bandpass', freq: 1200, q: 2, vol: 0.25, t });
    for (let i = 0; i < 12; i++) {
      const ct = t + 0.08 + i * 0.055 + Math.random() * 0.02;
      const f = 1800 + Math.random() * 1600;
      tone(f, 0.09, { type: 'square', vol: 0.045, t: ct });
      tone(f * 1.5, 0.12, { type: 'sine', vol: 0.04, t: ct + 0.02, reverb: true });
    }
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.9, { type: 'triangle', vol: 0.11, t: t + 0.12 + i * 0.06, reverb: true }));
    noise(0.9, { filter: 'highpass', freq: 7000, vol: 0.06, t: t + 0.3, reverb: true });
  },
  /** Upgrade/boost: power-up rise + anvil ring + sparkle. */
  upgrade() {
    if (!ok()) return;
    const t = now();
    tone(220, 0.45, { type: 'sawtooth', vol: 0.12, slide: 1760, t, attack: 0.05 });
    tone(330, 0.45, { type: 'square', vol: 0.05, slide: 2640, t, attack: 0.05 });
    noise(0.4, { filter: 'bandpass', freq: 400, sweep: 7000, q: 3, vol: 0.15, t });
    const h = t + 0.42;
    [880, 1983, 3127].forEach((f, i) => tone(f, 0.9, { type: 'sine', vol: 0.1 / (i + 1), t: h, reverb: true })); // anvil ping
    [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.25, { type: 'triangle', vol: 0.08, t: h + 0.05 + i * 0.05, reverb: true }));
  },
  /** Learn a new skill: mystic chime spell. */
  learn() {
    if (!ok()) return;
    const t = now();
    [587, 740, 880, 1175, 1480, 1760].forEach((f, i) => tone(f, 0.6, { type: 'sine', vol: 0.09, t: t + i * 0.07, reverb: true }));
    tone(147, 1.4, { type: 'triangle', vol: 0.12, t, attack: 0.3, reverb: true });
    noise(1.0, { filter: 'bandpass', freq: 3000, q: 6, vol: 0.06, t, reverb: true });
  },
  /** Shop purchase: register "ka-ching". */
  purchase() {
    if (!ok()) return;
    const t = now();
    noise(0.05, { filter: 'highpass', freq: 3000, vol: 0.25, t });
    tone(2637, 0.4, { type: 'square', vol: 0.06, t: t + 0.05, reverb: true });
    tone(3520, 0.5, { type: 'sine', vol: 0.07, t: t + 0.12, reverb: true });
    tone(150, 0.1, { type: 'sine', vol: 0.3, slide: 80, t });
  },
  /** Summoner level up: triumphant fanfare + gong. */
  levelUp() {
    if (!ok()) return;
    const t = now();
    [392, 523, 659].forEach((f, i) => brass(f, 0.18, t + i * 0.12, 0.13));
    [523, 659, 784, 1047].forEach((f) => brass(f, 1.3, t + 0.4, 0.07));
    drum(t + 0.4, 1.1);
    setTimeout(() => sfx.gong(), 400);
    noise(1.4, { filter: 'highpass', freq: 6500, vol: 0.07, t: t + 0.45, reverb: true });
  },
  error() { if (!ok()) return; tone(200, 0.15, { type: 'square', vol: 0.1 }); tone(150, 0.2, { type: 'square', vol: 0.1, t: now() + 0.12 }); },
};

function brass(f: number, dur: number, t: number, vol = 0.16) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const o2 = ctx.createOscillator();
  const fl = ctx.createBiquadFilter();
  const g = ctx.createGain();
  o.type = 'sawtooth'; o2.type = 'sawtooth';
  o.frequency.value = f; o2.frequency.value = f * 1.005;
  fl.type = 'lowpass'; fl.frequency.setValueAtTime(600, t); fl.frequency.linearRampToValueAtTime(2800, t + 0.08); fl.frequency.linearRampToValueAtTime(1400, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.04);
  g.gain.setValueAtTime(vol, t + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(fl); o2.connect(fl); fl.connect(g).connect(sfxBus); g.connect(verb);
  o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
}

function elementLayer(el: Element, amt: number) {
  const t = now();
  switch (el) {
    case 'fire': noise(0.6 * amt + 0.2, { filter: 'lowpass', freq: 1200, sweep: 300, vol: 0.35 * amt, t, reverb: true }); tone(70, 0.5, { type: 'sawtooth', vol: 0.12 * amt, slide: 40, t }); break;
    case 'water': noise(0.5, { filter: 'bandpass', freq: 800, sweep: 1600, q: 4, vol: 0.25 * amt, t }); [600, 900, 750].forEach((f, i) => tone(f, 0.08, { vol: 0.08 * amt, slide: f * 1.8, t: t + i * 0.06 })); break;
    case 'nature': noise(0.5, { filter: 'bandpass', freq: 2500, q: 1, vol: 0.15 * amt, t }); tone(180, 0.4, { type: 'triangle', vol: 0.15 * amt, slide: 90, t }); break;
    case 'electric': for (let i = 0; i < 6; i++) tone(200 + Math.random() * 1800, 0.04, { type: 'square', vol: 0.08 * amt, t: t + i * 0.035 }); noise(0.25, { filter: 'highpass', freq: 3000, vol: 0.2 * amt, t }); break;
    case 'shadow': tone(55, 0.8, { type: 'sawtooth', vol: 0.15 * amt, slide: 35, t, reverb: true }); noise(0.7, { filter: 'lowpass', freq: 500, vol: 0.2 * amt, t, reverb: true }); break;
    case 'crystal': [1568, 2093, 2637].forEach((f, i) => tone(f, 0.6, { type: 'sine', vol: 0.07 * amt, t: t + i * 0.05, reverb: true })); break;
  }
}

/* ---------------- Music: war drums + brass ostinato ---------------- */
function drum(t: number, vol: number, bus: AudioNode = sfxBus) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(130, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.35);
  env(g, t, 0.003, 0.9 * vol, 0.5);
  o.connect(g).connect(bus);
  g.connect(verb);
  o.start(t); o.stop(t + 0.6);
  noise(0.08, { filter: 'lowpass', freq: 1500, vol: 0.25 * vol, t, bus });
}

// D minor / phrygian flavored ostinato
const MENU_BASS = [73.4, 0, 73.4, 0, 87.3, 0, 82.4, 0, 73.4, 0, 73.4, 0, 65.4, 0, 69.3, 0];
const BATTLE_BASS = [73.4, 73.4, 0, 73.4, 77.8, 0, 73.4, 0, 73.4, 73.4, 0, 87.3, 82.4, 0, 77.8, 0];
const MELODY = [293.7, 0, 0, 349.2, 0, 329.6, 0, 0, 293.7, 0, 277.2, 0, 293.7, 0, 0, 0, 440, 0, 0, 392, 0, 349.2, 0, 0, 329.6, 0, 349.2, 0, 293.7, 0, 0, 0];

function scheduleStep(t: number, s: number) {
  if (!ctx || mood === 'off') return;
  const battle = mood === 'battle';
  const i = s % 16;
  const bar = Math.floor(s / 16);
  // taiko pattern
  const kick = battle ? [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1] : [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0];
  if (kick[i]) drum(t, i === 0 ? 0.9 : 0.55, musicBus);
  // rim / hand drum
  if (battle && i % 2 === 1) noise(0.04, { filter: 'highpass', freq: 3000, vol: 0.06, t, bus: musicBus });
  if (!battle && i % 4 === 2) noise(0.05, { filter: 'bandpass', freq: 1800, q: 3, vol: 0.06, t, bus: musicBus });
  // bass ostinato
  const bf = (battle ? BATTLE_BASS : MENU_BASS)[i];
  if (bf) {
    const o = ctx.createOscillator(); const fl = ctx.createBiquadFilter(); const g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = bf;
    fl.type = 'lowpass'; fl.frequency.value = battle ? 700 : 450;
    env(g, t, 0.01, 0.35, 0.2);
    o.connect(fl).connect(g).connect(musicBus); o.start(t); o.stop(t + 0.3);
  }
  // drone pad every 2 bars
  if (s % 32 === 0) {
    [146.8, 220, 293.7].forEach((f) => {
      const o = ctx!.createOscillator(); const g = ctx!.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 1); g.gain.exponentialRampToValueAtTime(0.0001, t + 7);
      o.connect(g).connect(musicBus); g.connect(verb); o.start(t); o.stop(t + 7.2);
    });
  }
  // brass/horn melody (battle every bar, menu every other bar)
  if (battle || bar % 2 === 1) {
    const mf = MELODY[s % 32];
    if (mf) {
      const o = ctx.createOscillator(); const o2 = ctx.createOscillator(); const fl = ctx.createBiquadFilter(); const g = ctx.createGain();
      o.type = 'sawtooth'; o2.type = 'square'; o.frequency.value = mf; o2.frequency.value = mf / 2;
      fl.type = 'lowpass'; fl.frequency.value = battle ? 1800 : 1100;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(battle ? 0.09 : 0.06, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      o.connect(fl); o2.connect(fl); fl.connect(g).connect(musicBus); g.connect(verb);
      o.start(t); o2.start(t); o.stop(t + 0.6); o2.stop(t + 0.6);
    }
  }
}

function startScheduler() {
  if (!ctx) return;
  nextBeat = ctx.currentTime + 0.1;
  timer = window.setInterval(() => {
    if (!ctx) return;
    const bpm = mood === 'battle' ? 140 : 96;
    const spb = 60 / bpm / 4; // 16th notes
    while (nextBeat < ctx.currentTime + 0.15) {
      scheduleStep(nextBeat, step++);
      nextBeat += spb;
    }
  }, 40);
}

export function setMusicMood(m: Mood) {
  if (m === mood) return;
  mood = m;
  step = 0;
}

/* ---------------- settings ---------------- */
export const audio = {
  get muted() { return muted; },
  get music() { return musicOn; },
  toggleMute() {
    muted = !muted;
    if (ctx) master.gain.setTargetAtTime(muted ? 0 : 0.8, ctx.currentTime, 0.05);
    persist();
  },
  toggleMusic() {
    musicOn = !musicOn;
    if (ctx) musicBus.gain.setTargetAtTime(musicOn ? 0.32 : 0, ctx.currentTime, 0.2);
    persist();
  },
  subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
};
