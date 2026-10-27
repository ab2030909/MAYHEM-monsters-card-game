/** Renders a collectible card to a PNG on a canvas — works for every image source. */
import type { Monster } from '../game/types';
import { ELEMENT_META, RARITY_META } from '../game/elements';
import { monsterStats } from '../game/stats';
import { activeAbility } from '../game/rules';
import { imageUrl } from './cloudinary';

const W = 900;
const H = 1260;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('Artwork could not be loaded.'));
    im.src = src;
  });
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function renderCardBlob(m: Monster): Promise<Blob> {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const rc = RARITY_META[m.rarity].color;
  const ec = ELEMENT_META[m.element].color;
  const s = monsterStats(m);
  const ab = activeAbility(m);

  // Frame
  const frame = ctx.createLinearGradient(0, 0, W, H);
  frame.addColorStop(0, rc);
  frame.addColorStop(0.5, '#1b1442');
  frame.addColorStop(1, ec);
  rr(ctx, 0, 0, W, H, 56);
  ctx.fillStyle = frame;
  ctx.fill();

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1a1340');
  bg.addColorStop(1, '#0b0820');
  rr(ctx, 16, 16, W - 32, H - 32, 44);
  ctx.fillStyle = bg;
  ctx.fill();

  // Art
  const art = await loadImage(imageUrl(m.image, 'full'));
  ctx.save();
  rr(ctx, 44, 150, W - 88, 760, 30);
  ctx.clip();
  const ratio = (W - 88) / 760;
  let sw = art.width;
  let sh = art.height;
  if (sw / sh > ratio) sw = sh * ratio;
  else sh = sw / ratio;
  ctx.drawImage(art, (art.width - sw) / 2, (art.height - sh) / 2, sw, sh, 44, 150, W - 88, 760);
  const fade = ctx.createLinearGradient(0, 700, 0, 910);
  fade.addColorStop(0, 'rgba(11,8,32,0)');
  fade.addColorStop(1, 'rgba(11,8,32,0.9)');
  ctx.fillStyle = fade;
  ctx.fillRect(44, 700, W - 88, 210);
  ctx.restore();

  ctx.strokeStyle = rc;
  ctx.lineWidth = 4;
  rr(ctx, 44, 150, W - 88, 760, 30);
  ctx.stroke();

  // Header
  ctx.fillStyle = '#fff';
  ctx.font = '700 64px "Lilita One", "Outfit", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(m.name, 60, 82, 600);
  ctx.textAlign = 'right';
  ctx.fillStyle = rc;
  ctx.font = '800 30px "Outfit", sans-serif';
  ctx.fillText(`LV ${m.level}`, W - 60, 66);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '600 24px "Outfit", sans-serif';
  ctx.fillText(`${RARITY_META[m.rarity].label.toUpperCase()} · ${ELEMENT_META[m.element].label.toUpperCase()}`, W - 60, 104);
  ctx.textAlign = 'left';

  // Ability
  ctx.fillStyle = ec;
  ctx.font = '700 34px "Outfit", sans-serif';
  ctx.fillText(`✦ ${ab.name}`, 60, 960);
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.font = '400 24px "Outfit", sans-serif';
  ctx.fillText(ab.description, 60, 1004, W - 120);

  // Stats
  const stats: [string, number, string][] = [
    ['HP', s.hp, '#4ade80'],
    ['ATK', s.attack, '#ff7a3d'],
    ['DEF', s.defense, '#38bdf8'],
    ['SPD', s.speed, '#facc15'],
  ];
  const bw = (W - 120 - 36) / 4;
  stats.forEach(([label, val, col], i) => {
    const x = 60 + i * (bw + 12);
    rr(ctx, x, 1048, bw, 120, 20);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fill();
    ctx.fillStyle = col;
    ctx.font = '700 22px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + bw / 2, 1082);
    ctx.fillStyle = '#fff';
    ctx.font = '800 44px "Outfit", sans-serif';
    ctx.fillText(String(val), x + bw / 2, 1132);
    ctx.textAlign = 'left';
  });

  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '700 20px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MAYHEM · CREATE YOUR LEGEND', W / 2, 1210);

  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('Render failed'))), 'image/png'));
}

export async function shareOrDownloadCard(m: Monster): Promise<'shared' | 'downloaded'> {
  const blob = await renderCardBlob(m);
  const file = new File([blob], `${m.name.replace(/\s+/g, '_')}-mayhem.png`, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] }) && window.matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({ files: [file], title: `${m.name} — MAYHEM`, text: `Check out my ${m.rarity} monster ${m.name}!` });
      return 'shared';
    } catch {
      /* fall through to download */
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return 'downloaded';
}
