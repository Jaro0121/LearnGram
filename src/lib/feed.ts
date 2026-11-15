/**
 * Feed builder: mixes new facts (ranked by the recommender), spaced-repetition
 * recall cards that are due, and optional live content.
 */
import { FACTS } from '../data/facts';
import { getFact } from './actions';
import { pool, refill } from './live';
import { baseScore, explain, pick, type Profile } from './recommender';
import { isDue, retrievability } from './srs';
import type { RecallMode, State } from './store';
import type { Fact, Item } from './types';

/** After how many fresh cards a due recall card is slotted in. */
export const RECALL_EVERY: Record<RecallMode, number> = { light: 8, balanced: 4, intense: 2 };

export const profileOf = (s: State): Profile => ({ interests: s.interests, cat: s.cat, tag: s.tag, explore: s.explore });

/** Facts due for review, most-forgotten first. */
export function dueFacts(s: State, now: number): Fact[] {
  return Object.entries(s.mem)
    .filter(([, m]) => isDue(m, now))
    .sort(([, a], [, b]) => retrievability(a, now) - retrievability(b, now))
    .map(([id]) => getFact(id))
    .filter((f): f is Fact => !!f && !!f.quiz);
}

let seq = 0;
const key = (p: string) => `${p}-${Date.now().toString(36)}-${seq++}`;

function sinceLastRecall(items: Item[]): number {
  let n = 0;
  for (let i = items.length - 1; i >= 0; i--) {
    if (items[i].kind !== 'fact') return n;
    n++;
  }
  return n;
}

export function buildBatch(s: State, prev: Item[], filter: string | null, n: number, now: number = Date.now(), rnd: () => number = Math.random): Item[] {
  const p = profileOf(s);
  const out: Item[] = [];
  const inFeed = new Set<string>();
  for (const it of prev) inFeed.add(it.kind === 'trivia' ? it.trivia.id : `${it.kind}:${it.fact.id}`);
  const recentCats = prev.slice(-2).map((it) => (it.kind === 'trivia' ? it.trivia.cat : it.fact.cat));
  let gap = sinceLastRecall(prev);
  const every = RECALL_EVERY[s.recall];
  const okCat = (c: string) => !filter || c === filter;

  const due = dueFacts(s, now).filter((f) => okCat(f.cat) && !inFeed.has(`review:${f.id}`));
  const unseen = () => FACTS.filter((f) => okCat(f.cat) && !s.seen[f.id] && !s.hidden[f.id] && !inFeed.has(`fact:${f.id}`));
  // Once everything has been seen, recycle the oldest-seen cards.
  const recycled = () => FACTS
    .filter((f) => okCat(f.cat) && !s.hidden[f.id] && !inFeed.has(`fact:${f.id}`))
    .sort((a, b) => (s.seen[a.id] ?? 0) - (s.seen[b.id] ?? 0))
    .slice(0, 12);

  for (let i = 0; i < n; i++) {
    if (due.length && gap >= every) {
      const f = due.shift()!;
      out.push({ key: key('r'), kind: 'review', fact: f });
      inFeed.add(`review:${f.id}`);
      gap = 0;
      continue;
    }
    if (s.live && pool.trivia.length && gap >= 3 && rnd() < 0.12) {
      const idx = pool.trivia.findIndex((t) => okCat(t.cat));
      if (idx >= 0) {
        const [t] = pool.trivia.splice(idx, 1);
        out.push({ key: key('t'), kind: 'trivia', trivia: t });
        inFeed.add(t.id);
        gap = 0;
        continue;
      }
    }
    let cands = unseen();
    if (s.live) cands = cands.concat(pool.facts.filter((f) => okCat(f.cat) && !s.seen[f.id] && !inFeed.has(`fact:${f.id}`)));
    if (!cands.length) cands = recycled();
    const f = pick(p, cands, recentCats, rnd);
    if (!f) break;
    if (f.live) pool.facts.splice(pool.facts.indexOf(f), 1);
    out.push({ key: key('f'), kind: 'fact', fact: f, why: explain(p, f) });
    inFeed.add(`fact:${f.id}`);
    recentCats.push(f.cat);
    if (recentCats.length > 2) recentCats.shift();
    gap++;
  }

  if (s.live) {
    // Seeds for "more like this": most recent likes/saves first, then top-ranked bundled facts.
    const recent = Object.entries({ ...s.saved, ...s.liked }).sort((a, b) => b[1] - a[1]).map(([id]) => getFact(id)).filter((f): f is Fact => !!f);
    const top = FACTS.filter((f) => okCat(f.cat)).sort((a, b) => baseScore(p, b) - baseScore(p, a)).slice(0, 10).sort(() => rnd() - 0.5);
    const cats = (filter ? [filter] : [...s.interests]).sort(() => rnd() - 0.5);
    void refill([...recent.filter((f) => okCat(f.cat)), ...top], cats, (id) => !!s.seen[id] || inFeed.has(id) || inFeed.has(`fact:${id}`));
  }
  return out;
}
