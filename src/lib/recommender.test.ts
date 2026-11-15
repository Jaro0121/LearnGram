import { describe, expect, it } from 'vitest';
import { FACTS, FACT_BY_ID } from '../data/facts';
import { CAT } from '../data/categories';
import { applySignal, baseScore, explain, pick, SIGNAL, type Profile } from './recommender';

const profile = (interests: string[], explore = 0): Profile => ({ interests, cat: {}, tag: {}, explore });
const seeded = (seed = 1) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

describe('content deck', () => {
  it('is well formed', () => {
    expect(FACTS.length).toBe(100);
    expect(new Set(FACTS.map((f) => f.id)).size).toBe(FACTS.length);
    for (const f of FACTS) {
      expect(CAT[f.cat], f.id).toBeTruthy();
      expect(f.tags.length, f.id).toBeGreaterThanOrEqual(2);
      expect(f.quiz!.options.length, f.id).toBe(4);
      expect(new Set(f.quiz!.options).size, f.id).toBe(4);
      expect(f.text.length, f.id).toBeLessThan(330);
    }
  });
});

describe('recommender', () => {
  it('ranks questionnaire interests above other categories', () => {
    const p = profile(['space']);
    expect(baseScore(p, FACT_BY_ID.sp1)).toBeGreaterThan(baseScore(p, FACT_BY_ID.mo1));
  });

  it('a like lifts similar cards (shared tags) to the front', () => {
    const p = profile(['space', 'history', 'money']);
    const before = baseScore(p, FACT_BY_ID.sp7); // tags: planets saturn density
    applySignal(p, FACT_BY_ID.sp1, SIGNAL.like); // tags: planets venus time
    expect(baseScore(p, FACT_BY_ID.sp7)).toBeGreaterThan(before);
    // a same-category card sharing a tag beats one that does not
    expect(baseScore(p, FACT_BY_ID.sp5)).toBeGreaterThan(baseScore(p, FACT_BY_ID.sp2));
    // and tags carry across categories: "time" also lifts a history card over its untagged sibling
    expect(baseScore(p, FACT_BY_ID.hi1)).toBeGreaterThan(baseScore(p, FACT_BY_ID.hi3));
    expect(explain(p, FACT_BY_ID.sp5)).toBe('Because you like #planets');
  });

  it('likes can pull in a category that was not picked in the questionnaire', () => {
    const p = profile(['space']);
    for (const id of ['mi1', 'mi2', 'mi3']) applySignal(p, FACT_BY_ID[id], SIGNAL.like);
    expect(baseScore(p, FACT_BY_ID.mi6)).toBeGreaterThan(baseScore(p, FACT_BY_ID.sp6));
  });

  it('"show less" pushes similar cards down', () => {
    const p = profile(['space', 'math']);
    applySignal(p, FACT_BY_ID.ma1, SIGNAL.less);
    expect(baseScore(p, FACT_BY_ID.ma3)).toBeLessThan(baseScore(p, FACT_BY_ID.sp4));
  });

  it('pick() favours liked topics but interleaves categories', () => {
    const p = profile(['space', 'nature', 'history']);
    applySignal(p, FACT_BY_ID.sp1, SIGNAL.like);
    applySignal(p, FACT_BY_ID.sp5, SIGNAL.like);
    const rnd = seeded(7);
    const pool = FACTS.filter((f) => f.id !== 'sp1' && f.id !== 'sp5');
    const recent: string[] = [];
    const cats: string[] = [];
    for (let i = 0; i < 12; i++) {
      const f = pick(p, pool, recent, rnd)!;
      pool.splice(pool.indexOf(f), 1);
      cats.push(f.cat);
      recent.push(f.cat);
      if (recent.length > 2) recent.shift();
    }
    expect(cats[0]).toBe('space');
    expect(cats.filter((c) => c === 'space').length).toBeGreaterThanOrEqual(4);
    for (let i = 2; i < cats.length; i++) expect(cats[i] === cats[i - 1] && cats[i] === cats[i - 2]).toBe(false);
    expect(cats.every((c) => ['space', 'nature', 'history'].includes(c))).toBe(true);
  });

  it('exploration surfaces categories outside the interests', () => {
    const p = profile(['space'], 0.4);
    const rnd = seeded(3);
    const cats = new Set<string>();
    for (let i = 0; i < 60; i++) cats.add(pick(p, FACTS, [], rnd)!.cat);
    expect(cats.size).toBeGreaterThan(3);
  });
});
