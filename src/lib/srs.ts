/**
 * Spaced-repetition scheduler (FSRS-inspired, simplified).
 *
 * Each fact has a memory state:
 *   s — stability: the interval (in days) after which recall probability drops to 90%
 *   d — difficulty: 1 (easy) … 10 (hard), adapts to your answers
 *
 * Recall probability follows the FSRS-4.5 power-law forgetting curve:
 *   R(t) = (1 + 19/81 · t/s) ^ -0.5        →  R(s) = 0.9
 *
 * We schedule the next review at t = s, i.e. right when recall is predicted to
 * fall to ~90%. Reviewing at that point — not earlier — is what gives the most
 * retention for the fewest reviews: a successful recall that took some effort
 * ("desirable difficulty") grows stability more than an easy one.
 */
export interface MemState {
  s: number;
  d: number;
  /** ms timestamps */
  due: number;
  last: number;
  reps: number;
  lapses: number;
}

export const MINUTE = 60_000;
export const DAY = 86_400_000;
/** First retrieval happens shortly after first exposure, still within the session. */
export const FIRST_GAP = 10 * MINUTE;
const FIRST_GAP_DAYS = FIRST_GAP / DAY;

export function initMem(now: number): MemState {
  return { s: FIRST_GAP_DAYS, d: 5, due: now + FIRST_GAP, last: now, reps: 0, lapses: 0 };
}

/** Predicted probability (0..1) of recalling the fact right now. */
export function retrievability(m: MemState, now: number): number {
  const t = Math.max(0, now - m.last) / DAY;
  return Math.pow(1 + (19 / 81) * (t / m.s), -0.5);
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export function review(m: MemState, correct: boolean, now: number): MemState {
  const r = retrievability(m, now);
  if (!correct) {
    // Lapse: relearn soon, keep a fraction of the old stability.
    const s = Math.max(FIRST_GAP_DAYS, m.s * 0.25);
    return { s, d: clamp(m.d + 1.5, 1, 10), due: now + FIRST_GAP, last: now, reps: m.reps, lapses: m.lapses + 1 };
  }
  const d = clamp(m.d - 0.3, 1, 10);
  let s: number;
  if (m.reps === 0) {
    s = 1; // first successful recall → see it again tomorrow
  } else {
    // Easier cards grow faster; recalls made when memory had faded more (low r) grow more.
    const growth = 1 + (11 - d) * 0.35 * (1 + (1 - r) * 1.5);
    s = Math.min(365, m.s * growth);
  }
  return { s, d, due: now + s * DAY, last: now, reps: m.reps + 1, lapses: m.lapses };
}

export function isDue(m: MemState, now: number): boolean {
  return m.due <= now;
}

export function fmtInterval(ms: number): string {
  if (ms < MINUTE) return 'a moment';
  if (ms < 60 * MINUTE) return `${Math.round(ms / MINUTE)} min`;
  if (ms < DAY) return `${Math.round(ms / (60 * MINUTE))} h`;
  const days = Math.round(ms / DAY);
  if (days < 30) return days === 1 ? '1 day' : `${days} days`;
  const months = Math.round(days / 30);
  return months === 1 ? '1 month' : `${months} months`;
}
