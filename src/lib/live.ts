/**
 * Optional live content. Everything here fails silently — the app is fully
 * usable offline with the bundled deck.
 *
 *  • Wikipedia (MediaWiki Action API, CORS via origin=*): "morelike:" search
 *    finds articles similar to something the user liked, with a short extract
 *    and a thumbnail. Text is CC BY-SA.
 *  • Open Trivia DB (opentdb.com, CC BY-SA 4.0): multiple-choice questions.
 */
import { CAT } from '../data/categories';
import type { Fact, Trivia } from './types';

const TIMEOUT = 8000;
/** Back off from a host after it answers 429 (too many requests). */
const backoff: Record<string, number> = {};
const JUNK = /^(List|Lists|Outline|Index|Glossary|Timeline) of |\(disambiguation\)/i;

async function getJSON(url: string, headers?: Record<string, string>): Promise<any> {
  const host = new URL(url).host;
  if ((backoff[host] ?? 0) > Date.now()) throw new Error('backoff');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { signal: ctl.signal, headers });
    if (res.status === 429) backoff[host] = Date.now() + 30_000;
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const firstSentences = (text: string, max = 320): string => {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return end > 120 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, '') + '…';
};

export function parseWiki(json: any, cat: string, tags: string[]): Fact[] {
  const pages: any[] = json?.query?.pages ?? [];
  return pages
    .slice()
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .filter((p) => typeof p.extract === 'string' && p.extract.length >= 80 && !/may refer to/i.test(p.extract) && !JUNK.test(p.title))
    .map((p) => ({
      id: `w:${p.pageid}`,
      cat,
      tags,
      title: p.title,
      text: firstSentences(p.extract),
      img: p.thumbnail?.source,
      url: p.fullurl ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title)}`,
      live: true,
    }));
}

export async function fetchSimilar(seed: Fact): Promise<Fact[]> {
  if (!seed.wiki && !seed.live) return [];
  const title = seed.wiki ?? seed.title;
  const url = 'https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&origin=*'
    + `&generator=search&gsrsearch=${encodeURIComponent('morelike:' + title)}&gsrlimit=8&gsrnamespace=0`
    + '&prop=extracts%7Cpageimages%7Cinfo&exintro=1&explaintext=1&exlimit=max&piprop=thumbnail&pithumbsize=800&inprop=url';
  // Wikimedia asks API clients to identify themselves; browsers may not change User-Agent, so this header is the official alternative.
  return parseWiki(await getJSON(url, { 'Api-User-Agent': 'LearnGram/1.0 (educational learning app)' }), seed.cat, seed.tags.slice(0, 2));
}

export function parseTrivia(json: any, cat: string): Trivia[] {
  const dec = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };
  if (json?.response_code !== 0) return [];
  const rs: any[] = json?.results ?? [];
  return rs
    .filter((r) => r.type === 'multiple' && Array.isArray(r.incorrect_answers) && r.incorrect_answers.length === 3)
    .map((r) => {
      const q = dec(r.question);
      return { id: `t:${q}`, cat, q, options: [dec(r.correct_answer), ...r.incorrect_answers.map(dec)] };
    });
}

export async function fetchTrivia(cat: string): Promise<Trivia[]> {
  const id = CAT[cat]?.trivia;
  if (!id) return [];
  return parseTrivia(await getJSON(`https://opentdb.com/api.php?amount=6&category=${id}&type=multiple&encode=url3986`), cat);
}

// ── in-memory pools, topped up in the background ──
export const pool: { facts: Fact[]; trivia: Trivia[] } = { facts: [], trivia: [] };
const usedSeeds = new Set<string>();
const usedTriviaCats = new Map<string, number>();
let busy = false;

export async function refill(seeds: Fact[], cats: string[], known: (id: string) => boolean): Promise<void> {
  if (busy || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
  busy = true;
  try {
    if (pool.facts.length < 4) {
      const seed = seeds.find((s) => !usedSeeds.has(s.id));
      if (seed) {
        usedSeeds.add(seed.id);
        // On failure (offline, rate-limited) give the seed back so it is retried later.
        const got = await fetchSimilar(seed).catch(() => { usedSeeds.delete(seed.id); return [] as Fact[]; });
        for (const g of got) if (!known(g.id) && !pool.facts.some((x) => x.id === g.id)) pool.facts.push(g);
      }
    }
    if (pool.trivia.length < 2) {
      const now = Date.now();
      // Open Trivia DB asks for at most one request every 5 seconds.
      const cat = cats.find((c) => CAT[c]?.trivia && now - (usedTriviaCats.get(c) ?? 0) > 120_000);
      if (cat) {
        usedTriviaCats.set(cat, now);
        const got = await fetchTrivia(cat).catch(() => { usedTriviaCats.delete(cat); return [] as Trivia[]; });
        for (const g of got) if (!known(g.id) && !pool.trivia.some((x) => x.id === g.id)) pool.trivia.push(g);
      }
    }
  } finally {
    busy = false;
  }
}
