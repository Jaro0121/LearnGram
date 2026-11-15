import { describe, expect, it } from 'vitest';
import { buildBatch } from './feed';
import { parseTrivia, parseWiki } from './live';
import { DAY, initMem } from './srs';
import { fresh, type State } from './store';
import type { Item } from './types';

const base = (over: Partial<State> = {}): State => ({ ...fresh(), onboarded: true, interests: ['space', 'mind', 'math'], live: false, explore: 0, ...over });
const now = 1_700_000_000_000;
const rnd = () => 0.5;

describe('feed builder', () => {
  it('fills the feed with unseen facts from the chosen interests, without duplicates', () => {
    const s = base();
    const a = buildBatch(s, [], null, 6, now, rnd);
    const b = buildBatch(s, a, null, 6, now, rnd);
    const all = [...a, ...b];
    expect(all.length).toBe(12);
    const ids = all.map((it) => (it.kind === 'fact' ? it.fact.id : ''));
    expect(new Set(ids).size).toBe(12);
    expect(all.every((it) => it.kind === 'fact' && s.interests.includes(it.fact.cat))).toBe(true);
  });

  it('slots due recall cards in at the chosen frequency', () => {
    const mem = { sp1: { ...initMem(now - DAY) }, mi1: { ...initMem(now - DAY) }, ma1: { ...initMem(now) } };
    const seen = { sp1: now - DAY, mi1: now - DAY, ma1: now };
    const kinds = (s: State) => buildBatch(s, [], null, 8, now, rnd).map((i: Item) => i.kind);
    // nothing precedes the first card, so a recall waits until `every` fresh cards have passed
    expect(kinds(base({ mem, seen, recall: 'intense' }))).toEqual(['fact', 'fact', 'review', 'fact', 'fact', 'review', 'fact', 'fact']);
    expect(kinds(base({ mem, seen, recall: 'balanced' }))).toEqual(['fact', 'fact', 'fact', 'fact', 'review', 'fact', 'fact', 'fact']);
    expect(kinds(base({ mem, seen, recall: 'light' })).filter((k) => k === 'review').length).toBe(0);
  });

  it('respects a category filter and hidden cards', () => {
    const s = base({ hidden: { ge1: now } });
    const items = buildBatch(s, [], 'geography', 20, now, rnd);
    expect(items.length).toBe(9);
    expect(items.every((it) => it.kind === 'fact' && it.fact.cat === 'geography' && it.fact.id !== 'ge1')).toBe(true);
  });

  it('recycles the oldest cards once everything was seen', () => {
    const seen: Record<string, number> = {};
    for (let i = 1; i <= 10; i++) seen[`ge${i}`] = now - i * 1000;
    const items = buildBatch(base({ seen }), [], 'geography', 3, now, rnd);
    expect(items.length).toBe(3);
  });
});

describe('live content parsers', () => {
  it('turns a MediaWiki response into cards', () => {
    const json = { query: { pages: [
      { pageid: 2, index: 2, title: 'Mars', extract: 'Mars is the fourth planet from the Sun. ' + 'It is often called the Red Planet. '.repeat(3), thumbnail: { source: 'https://upload.wikimedia.org/m.jpg' }, fullurl: 'https://en.wikipedia.org/wiki/Mars' },
      { pageid: 1, index: 1, title: 'Mercury', extract: 'Mercury may refer to: a planet, an element, a god and several other things entirely.'.repeat(2) },
      { pageid: 3, index: 3, title: 'Stub', extract: 'Too short.' },
    ] } };
    const out = parseWiki(json, 'space', ['planets']);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: 'w:2', cat: 'space', title: 'Mars', live: true, img: 'https://upload.wikimedia.org/m.jpg' });
    expect(parseWiki({}, 'space', [])).toEqual([]);
  });

  it('decodes Open Trivia DB questions with the correct answer first', () => {
    const json = { results: [{ type: 'multiple', question: 'What%20is%202%2B2%3F', correct_answer: '4', incorrect_answers: ['3', '5', '22'] }, { type: 'boolean', question: 'x', correct_answer: 'True', incorrect_answers: ['False'] }] };
    expect(parseTrivia(json, 'math')).toEqual([{ id: 't:What is 2+2?', cat: 'math', q: 'What is 2+2?', options: ['4', '3', '5', '22'] }]);
  });
});
