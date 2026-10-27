/**
 * Cloudinary integration — unsigned browser uploads + delivery URL transformations.
 * Only the cloud name and an UNSIGNED upload preset are used client-side.
 * The API secret must never be present in browser code.
 */
import type { Monster, MonsterImage } from '../game/types';
import { ELEMENT_META, RARITY_META } from '../game/elements';
import { monsterStats } from '../game/stats';
import { activeAbility } from '../game/rules';

const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME?.trim() || '';
const PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET?.trim() || '';

export const cloudinaryConfigured = Boolean(CLOUD && PRESET);
export const cloudName = CLOUD;

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const MAX_BYTES = 10 * 1024 * 1024;

export function validateImage(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return 'Unsupported file type. Use JPG, PNG, WEBP or GIF.';
  if (file.size > MAX_BYTES) return `That image is ${(file.size / 1048576).toFixed(1)} MB — the limit is 10 MB.`;
  return null;
}

export interface UploadResult {
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  version: number;
}

export interface UploadHandle {
  promise: Promise<UploadResult>;
  abort: () => void;
}

export function uploadImage(file: File, onProgress: (pct: number) => void): UploadHandle {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<UploadResult>((resolve, reject) => {
    if (!cloudinaryConfigured) return reject(new Error('Cloudinary is not configured.'));
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', PRESET);
    form.append('folder', 'monstersnap');
    form.append('tags', 'monstersnap,monster-art');

    xhr.open('POST', `https://api.cloudinary.com/v1_1/${encodeURIComponent(CLOUD)}/image/upload`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ publicId: body.public_id, secureUrl: body.secure_url, width: body.width, height: body.height, version: body.version });
        } else {
          reject(new Error(body?.error?.message ? `Cloudinary: ${body.error.message}` : `Upload failed (HTTP ${xhr.status}).`));
        }
      } catch {
        reject(new Error(`Upload failed (HTTP ${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error — check your connection and try again.'));
    xhr.onabort = () => reject(new Error('Upload cancelled.'));
    xhr.send(form);
  });
  return { promise, abort: () => xhr.abort() };
}

export type ImageSize = 'thumb' | 'card' | 'full';
const SIZES: Record<ImageSize, [number, number]> = { thumb: [300, 400], card: [600, 800], full: [960, 1280] };

const base = () => `https://res.cloudinary.com/${CLOUD}/image/upload`;

/** Optimized card-framed delivery URL: smart crop to 3:4, auto format & quality. */
export function cloudinaryUrl(publicId: string, size: ImageSize, opts: { removeBg?: boolean; version?: number } = {}) {
  const [w, h] = SIZES[size];
  const parts = [] as string[];
  if (opts.removeBg) parts.push('e_background_removal');
  // g_auto:faces — smart crop that keeps faces in frame for the 3:4 card window.
  parts.push(`c_fill,g_auto:faces,w_${w},h_${h}`, 'f_auto,q_auto');
  const v = opts.version ? `v${opts.version}/` : '';
  return `${base()}/${parts.join('/')}/${v}${publicId}`;
}

export function imageUrl(img: MonsterImage, size: ImageSize = 'card'): string {
  switch (img.kind) {
    case 'bundled':
      return img.path;
    case 'local':
      return img.dataUrl;
    case 'cloudinary':
      return cloudinaryUrl(img.publicId, size, { removeBg: img.removeBg, version: img.version });
  }
}

/** Fallback URL used if a background-removed derivative fails (add-on not enabled). */
export function imageFallbackUrl(img: MonsterImage, size: ImageSize = 'card'): string | null {
  if (img.kind === 'cloudinary' && img.removeBg) return cloudinaryUrl(img.publicId, size, { version: img.version });
  return null;
}

/** Escape text for Cloudinary text overlays (commas and slashes must be double-encoded). */
function overlayText(t: string) {
  return encodeURIComponent(t).replace(/%2C/g, '%252C').replace(/%2F/g, '%252F').replace(/'/g, '%27');
}

const hex = (c: string) => c.replace('#', '');

/**
 * A fully composed collectible card delivered by Cloudinary:
 * smart-cropped art, vibrance boost, name / rarity / stats text overlays and a rarity border.
 */
export function cloudinaryShareCardUrl(m: Monster, download = false): string | null {
  if (m.image.kind !== 'cloudinary') return null;
  const s = monsterStats(m);
  const rc = hex(RARITY_META[m.rarity].color);
  const ec = hex(ELEMENT_META[m.element].color);
  const t = [
    'c_fill,g_auto:faces,w_900,h_1200',
    'e_vibrance:30',
    `l_text:Arial_76_bold:${overlayText(m.name)},co_white,b_rgb:0b0820cc,g_north_west,x_48,y_48`,
    `l_text:Arial_34_bold:${overlayText(`${RARITY_META[m.rarity].label.toUpperCase()}  ·  ${ELEMENT_META[m.element].label.toUpperCase()}  ·  LV ${m.level}`)},co_rgb:${rc},b_rgb:0b0820cc,g_north_west,x_50,y_150`,
    `l_text:Arial_38_bold:${overlayText(`HP ${s.hp}   ATK ${s.attack}   DEF ${s.defense}   SPD ${s.speed}`)},co_white,b_rgb:0b0820dd,g_south,y_110`,
    `l_text:Arial_32_italic:${overlayText(`✦ ${activeAbility(m).name}`)},co_rgb:${ec},b_rgb:0b0820dd,g_south,y_56`,
    `l_text:Arial_26_bold:MAYHEM,co_rgb:ffffff99,g_south_east,x_40,y_16`,
    `bo_18px_solid_rgb:${rc}`,
    'r_40',
    'f_auto,q_auto',
  ];
  if (download) t.push(`fl_attachment:${overlayText(m.name.replace(/[^a-z0-9-_]/gi, '_'))}-card`);
  const v = m.image.version ? `v${m.image.version}/` : '';
  return `${base()}/${t.join('/')}/${v}${m.image.publicId}`;
}

/** Local fallback: center-crop to 3:4, resize and compress so it fits in localStorage. */
export function fileToCardDataUrl(file: File, width = 540): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      const targetRatio = 3 / 4;
      let sw = im.width;
      let sh = im.height;
      if (sw / sh > targetRatio) sw = sh * targetRatio;
      else sh = sw / targetRatio;
      const sx = (im.width - sw) / 2;
      const sy = (im.height - sh) * 0.3; // bias upward — faces usually sit in the top half
      const c = document.createElement('canvas');
      c.width = width;
      c.height = Math.round(width / targetRatio);
      const ctx = c.getContext('2d')!;
      ctx.drawImage(im, sx, sy, sw, sh, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    im.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image.'));
    };
    im.src = url;
  });
}
