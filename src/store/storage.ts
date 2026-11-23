import { get, set, del } from 'idb-keyval';
import type { StateStorage } from 'zustand/middleware';

export const STORE_KEY = 'boxbox:v2';
const LEGACY_KEY = 'pitwall:v1';

/**
 * IndexedDB, with a one-time import from the Phase 1 localStorage key.
 * Falls back to localStorage if IndexedDB is unavailable (some private windows).
 */
export const idbStorage: StateStorage = {
  async getItem(name) {
    try {
      const v = await get<string>(name);
      if (v != null) return v;
    } catch {
      return safeLocal.getItem(name);
    }
    const legacy = safeLocal.getItem(LEGACY_KEY);
    return legacy ?? null;
  },
  async setItem(name, value) {
    try {
      await set(name, value);
    } catch {
      safeLocal.setItem(name, value);
    }
  },
  async removeItem(name) {
    try { await del(name); } catch { safeLocal.removeItem(name); }
  },
};

const safeLocal = {
  getItem(k: string) { try { return localStorage.getItem(k); } catch { return null; } },
  setItem(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* storage full or blocked */ } },
  removeItem(k: string) { try { localStorage.removeItem(k); } catch { /* blocked */ } },
};
