import { useSyncExternalStore } from 'react';
import type { Fact } from './types';
import type { MemState } from './srs';

export type RecallMode = 'light' | 'balanced' | 'intense';

export interface State {
  v: 1;
  onboarded: boolean;
  name: string;
  interests: string[];
  goal: number;
  recall: RecallMode;
  explore: number;
  live: boolean;
  cat: Record<string, number>;
  tag: Record<string, number>;
  liked: Record<string, number>;
  saved: Record<string, number>;
  seen: Record<string, number>;
  hidden: Record<string, number>;
  mem: Record<string, MemState>;
  /** live (Wikipedia) facts the user interacted with, kept so likes/saves survive reloads */
  kept: Record<string, Fact>;
  day: { date: string; count: number };
  streak: { last: string; count: number };
  xp: number;
  quiz: { right: number; wrong: number };
}

const KEY = 'learngram:v1';

export const fresh = (): State => ({
  v: 1, onboarded: false, name: '', interests: [], goal: 10, recall: 'balanced', explore: 0.15, live: true,
  cat: {}, tag: {}, liked: {}, saved: {}, seen: {}, hidden: {}, mem: {}, kept: {},
  day: { date: '', count: 0 }, streak: { last: '', count: 0 }, xp: 0, quiz: { right: 0, wrong: 0 },
});

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && p.v === 1) return { ...fresh(), ...p };
    }
  } catch { /* storage unavailable or corrupt → start fresh */ }
  return fresh();
}

let state: State = load();
const subs = new Set<() => void>();

export const getState = (): State => state;

export function update(fn: (s: State) => void): void {
  const next = structuredClone(state);
  fn(next);
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore quota errors */ }
  subs.forEach((f) => f());
}

/** Backup file contents (JSON). */
export function exportBackup(): string {
  return JSON.stringify({ app: 'LearnGram', exported: new Date().toISOString(), state }, null, 1);
}

/** Restores a backup. Throws with a readable message if the file is not a LearnGram backup. */
export function importBackup(text: string): void {
  let data: any;
  try { data = JSON.parse(text); } catch { throw new Error('That file is not a LearnGram backup.'); }
  const st = data?.app === 'LearnGram' ? data.state : null;
  if (!st || st.v !== 1 || typeof st.seen !== 'object' || typeof st.mem !== 'object' || !Array.isArray(st.interests)) {
    throw new Error('That file is not a LearnGram backup.');
  }
  update((s) => { Object.assign(s, fresh(), st); });
}

/** Ask the browser not to evict our data under storage pressure (best effort). */
export function requestPersistence(): void {
  try { void navigator.storage?.persist?.(); } catch { /* unsupported */ }
}

export function resetAll(): void {
  state = fresh();
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  subs.forEach((f) => f());
}

const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export const useStore = (): State => useSyncExternalStore(subscribe, getState);
