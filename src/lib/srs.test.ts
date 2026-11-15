import { describe, expect, it } from 'vitest';
import { DAY, FIRST_GAP, initMem, isDue, retrievability, review } from './srs';

describe('spaced repetition scheduler', () => {
  const t0 = 1_700_000_000_000;

  it('schedules the first recall shortly after first exposure', () => {
    const m = initMem(t0);
    expect(m.due - t0).toBe(FIRST_GAP);
    expect(isDue(m, t0)).toBe(false);
    expect(isDue(m, t0 + FIRST_GAP)).toBe(true);
  });

  it('predicts 100% recall immediately and ~90% at the due time', () => {
    let m = review(initMem(t0), true, t0 + FIRST_GAP);
    expect(retrievability(m, m.last)).toBe(1);
    expect(retrievability(m, m.due)).toBeCloseTo(0.9, 5);
    m = review(m, true, m.due);
    expect(retrievability(m, m.due)).toBeCloseTo(0.9, 5);
  });

  it('grows intervals with every successful recall', () => {
    let m = initMem(t0);
    const gaps: number[] = [];
    let now = m.due;
    for (let i = 0; i < 5; i++) {
      m = review(m, true, now);
      gaps.push((m.due - now) / DAY);
      now = m.due;
    }
    expect(gaps[0]).toBe(1);
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeGreaterThan(gaps[i - 1] * 2);
    expect(gaps[4]).toBeGreaterThan(60); // five reviews cover months
  });

  it('a lapse brings the card back soon, shrinks stability and raises difficulty', () => {
    let m = initMem(t0);
    let now = m.due;
    for (let i = 0; i < 3; i++) { m = review(m, true, now); now = m.due; }
    const lapsed = review(m, false, now);
    expect(lapsed.due - now).toBe(FIRST_GAP);
    expect(lapsed.s).toBeLessThan(m.s);
    expect(lapsed.d).toBeGreaterThan(m.d);
    expect(lapsed.lapses).toBe(1);
    // but relearning is faster than starting over
    const again = review(lapsed, true, lapsed.due);
    expect(again.s).toBeGreaterThan(1);
  });

  it('rewards recalls made after more forgetting (desirable difficulty)', () => {
    const m = review(review(initMem(t0), true, t0 + FIRST_GAP), true, t0 + FIRST_GAP + DAY);
    const early = review(m, true, m.last + 0.2 * m.s * DAY);
    const onTime = review(m, true, m.due);
    expect(onTime.s).toBeGreaterThan(early.s);
  });
});
