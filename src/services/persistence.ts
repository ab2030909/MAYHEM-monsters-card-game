/**
 * Persistence layer. The game only talks to `StorageAdapter`, so swapping
 * localStorage for a real backend later means implementing this interface.
 * Never store secrets or auth tokens here.
 */
import type { PlayerState } from '../game/types';

export interface StorageAdapter {
  load(): PlayerState | null;
  save(state: PlayerState): { ok: true } | { ok: false; error: string };
  clear(): void;
}

const KEY = 'monstersnap.save.v1';

export const localStorageAdapter: StorageAdapter = {
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as PlayerState) : null;
    } catch {
      return null;
    }
  },
  save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return { ok: true };
    } catch (e) {
      const quota = e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22);
      return { ok: false, error: quota ? 'Local storage is full — configure Cloudinary to store artwork in the cloud.' : 'Could not save progress.' };
    }
  },
  clear() {
    localStorage.removeItem(KEY);
  },
};

export const storage: StorageAdapter = localStorageAdapter;
