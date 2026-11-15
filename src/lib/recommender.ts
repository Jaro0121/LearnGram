/**
 * Like-driven recommender (content-based).
 *
 * The profile keeps an affinity score per category and per tag. Every signal
 * (like, save, long read, quick skip, "show less") nudges the scores of the
 * card's category and tags. Candidate cards are then ranked by:
 *
 *   questionnaire interest  +  learned category affinity  +  learned tag affinity
 *   − repetition penalty (interleaving)  +  exploration noise
 *
 * so cards similar to what you liked rise to the front, while a tunable amount
 * of exploration keeps the feed from collapsing into a bubble.
 */
import type { Fact } from './types';

export interface Profile {
  interests: string[];
  cat: Record<string, number>;
  tag: Record<string, number>;
  /** 0..1 — how adventurous the feed is */
  explore: number;
}

export const SIGNAL = {
  like: 1.2,
  unlike: -1.2,
  save: 1.5,
  unsave: -1.5,
  longRead: 0.3,
  skip: -0.25,
  less: -2.5,
  correct: 0.1,
} as const;

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** Mutates the profile in place. */
export function applySignal(p: Pick<Profile, 'cat' | 'tag'>, fact: Pick<Fact, 'cat' | 'tags'>, w: number): void {
  p.cat[fact.cat] = clamp((p.cat[fact.cat] ?? 0) + w * 0.6, -6, 10);
  for (const t of fact.tags) p.tag[t] = clamp((p.tag[t] ?? 0) + w, -6, 10);
}

export function tagAffinity(p: Pick<Profile, 'tag'>, fact: Pick<Fact, 'tags'>): number {
  if (!fact.tags.length) return 0;
  let sum = 0;
  let best = 0;
  for (const t of fact.tags) {
    const v = p.tag[t] ?? 0;
    sum += v;
    if (v > best) best = v;
  }
  // Mean captures overall match; the best tag lets one strong shared topic pull a card up.
  return sum / fact.tags.length + best * 0.5;
}

/** Deterministic part of the score (no noise, no context). */
export function baseScore(p: Profile, fact: Fact): number {
  const interest = p.interests.includes(fact.cat) ? 1 : 0.15;
  const cat = Math.tanh((p.cat[fact.cat] ?? 0) / 3);
  const tag = Math.tanh(tagAffinity(p, fact) / 2) * 1.6;
  return interest + cat + tag;
}

export function score(p: Profile, fact: Fact, recentCats: string[], rnd: () => number = Math.random): number {
  let s = baseScore(p, fact);
  // Interleaving: avoid long runs of one category.
  const n = recentCats.length;
  if (n && recentCats[n - 1] === fact.cat) s -= 0.5;
  if (n > 1 && recentCats[n - 1] === fact.cat && recentCats[n - 2] === fact.cat) s -= 1.5;
  s += (rnd() - 0.5) * (0.4 + p.explore * 1.6);
  return s;
}

/** Pick the next card from candidates; with probability `explore` pick a random one instead. */
export function pick(p: Profile, candidates: Fact[], recentCats: string[], rnd: () => number = Math.random): Fact | undefined {
  if (!candidates.length) return undefined;
  if (rnd() < p.explore * 0.5) return candidates[Math.floor(rnd() * candidates.length)];
  let best: Fact | undefined;
  let bestS = -Infinity;
  for (const c of candidates) {
    const s = score(p, c, recentCats, rnd);
    if (s > bestS) { bestS = s; best = c; }
  }
  return best;
}

/** Human-readable reason shown on the card. */
export function explain(p: Profile, fact: Fact): string {
  let top = '';
  let topV = 0.6;
  for (const t of fact.tags) {
    const v = p.tag[t] ?? 0;
    if (v > topV) { topV = v; top = t; }
  }
  if (top) return `Because you like #${top}`;
  if ((p.cat[fact.cat] ?? 0) > 0.6) return 'More of what you enjoy';
  if (p.interests.includes(fact.cat)) return 'From your interests';
  return 'Something new to explore';
}
