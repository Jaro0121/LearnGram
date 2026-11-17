import { FACT_BY_ID } from '../data/facts';
import { applySignal, SIGNAL } from './recommender';
import { initMem, review, DAY } from './srs';
import { getState, update } from './store';
import { toast } from './toast';
import { haptic } from './native';
import type { Fact } from './types';

export const dayKey = (t: number = Date.now()): string => {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** Streak as it stands today: it only survives if you learned something today or yesterday. */
export function currentStreak(s: { streak: { last: string; count: number } }, now: number = Date.now()): number {
  return s.streak.last === dayKey(now) || s.streak.last === dayKey(now - DAY) ? s.streak.count : 0;
}

export const buzz = (ms: number | number[] = 12) => haptic(ms);

export const getFact = (id: string): Fact | undefined => FACT_BY_ID[id] ?? getState().kept[id];

export function toggleLike(fact: Fact): void {
  update((s) => {
    if (s.liked[fact.id]) { delete s.liked[fact.id]; applySignal(s, fact, SIGNAL.unlike); }
    else { s.liked[fact.id] = Date.now(); applySignal(s, fact, SIGNAL.like); if (fact.live) s.kept[fact.id] = fact; buzz(); }
  });
}

export function toggleSave(fact: Fact): void {
  update((s) => {
    if (s.saved[fact.id]) { delete s.saved[fact.id]; applySignal(s, fact, SIGNAL.unsave); }
    else { s.saved[fact.id] = Date.now(); applySignal(s, fact, SIGNAL.save); if (fact.live) s.kept[fact.id] = fact; }
  });
}

export function showLess(fact: Fact): void {
  update((s) => { s.hidden[fact.id] = Date.now(); applySignal(s, fact, SIGNAL.less); });
}

export function dwell(fact: Fact, ms: number): void {
  const s0 = getState();
  if (ms < 1000 && !s0.liked[fact.id] && !s0.seen[fact.id]) update((s) => applySignal(s, fact, SIGNAL.skip));
  else if (ms > 7000) update((s) => applySignal(s, fact, SIGNAL.longRead));
}

function bumpDay(s: ReturnType<typeof getState>, now: number): void {
  const today = dayKey(now);
  if (s.day.date !== today) s.day = { date: today, count: 0 };
  s.day.count += 1;
  if (s.streak.last !== today) {
    s.streak = { last: today, count: s.streak.last === dayKey(now - DAY) ? s.streak.count + 1 : 1 };
  }
}

/** Called once a fact has actually been read (stayed on screen). Starts its memory schedule. */
export function markSeen(fact: Fact): void {
  if (getState().seen[fact.id]) return;
  const now = Date.now();
  let hitGoal = false;
  update((s) => {
    s.seen[fact.id] = now;
    s.xp += 5;
    if (fact.quiz) s.mem[fact.id] = initMem(now);
    bumpDay(s, now);
    hitGoal = s.day.count === s.goal;
  });
  if (hitGoal) { toast('🎉 Daily goal reached!'); buzz([20, 60, 20]); }
}

/** Returns the time until the next review, in ms. */
export function answerReview(fact: Fact, correct: boolean): number {
  const now = Date.now();
  let gap = 0;
  update((s) => {
    const m = review(s.mem[fact.id] ?? initMem(now), correct, now);
    s.mem[fact.id] = m;
    gap = m.due - now;
    if (correct) { s.quiz.right += 1; s.xp += 10; applySignal(s, fact, SIGNAL.correct); }
    else s.quiz.wrong += 1;
  });
  buzz(correct ? 12 : [30, 40, 30]);
  return gap;
}

export function answerTrivia(correct: boolean): void {
  update((s) => {
    if (correct) { s.quiz.right += 1; s.xp += 10; } else s.quiz.wrong += 1;
  });
  buzz(correct ? 12 : [30, 40, 30]);
}
