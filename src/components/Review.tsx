import { useState } from 'react';
import { getFact } from '../lib/actions';
import { dueFacts } from '../lib/feed';
import { fmtInterval, retrievability } from '../lib/srs';
import { useStore } from '../lib/store';
import type { Fact } from '../lib/types';
import { ReviewCard } from './Cards';

export function Review({ now }: { now: number }) {
  const s = useStore();
  const [queue, setQueue] = useState<Fact[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [startRight, setStartRight] = useState(0);
  const [answered, setAnswered] = useState(false);

  const due = dueFacts(s, now);
  const tracked = Object.keys(s.mem).length;
  const nextDue = Math.min(...Object.values(s.mem).map((m) => m.due).filter((d) => d > now));
  const start = (facts: Fact[]) => { setQueue(facts.slice(0, 10)); setIdx(0); setAnswered(false); setStartRight(s.quiz.right); };
  const early = () => start(
    Object.entries(s.mem).sort(([, a], [, b]) => retrievability(a, now) - retrievability(b, now))
      .map(([id]) => getFact(id)).filter((f): f is Fact => !!f && !!f.quiz),
  );

  if (queue) {
    if (idx >= queue.length) {
      return (
        <div className="page center">
          <div className="big-emoji">🎉</div>
          <h1>Session complete</h1>
          <p className="lead">{s.quiz.right - startRight} of {queue.length} recalled correctly. Each recall pushed the next review further away.</p>
          <button className="btn primary" onClick={() => setQueue(null)}>Done</button>
        </div>
      );
    }
    const fact = queue[idx];
    return (
      <div className="page review-run">
        <div className="run-top">
          <button className="btn ghost sm" onClick={() => setQueue(null)}>Close</button>
          <span>{idx + 1} / {queue.length}</span>
        </div>
        <ReviewCard key={fact.id + idx} fact={fact} inFeed={false} onAnswered={() => setAnswered(true)} />
        <button className="btn primary" disabled={!answered} onClick={() => { setIdx(idx + 1); setAnswered(false); }}>{idx + 1 === queue.length ? 'Finish' : 'Next'}</button>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Review</h1>
      <p className="lead">Answering from memory just before you forget is the most efficient way to remember.</p>
      <div className="panel hero">
        <div className="hero-n" data-testid="due-count">{due.length}</div>
        <div>{due.length === 1 ? 'fact is' : 'facts are'} ready for recall</div>
        {due.length > 0
          ? <button className="btn primary" onClick={() => start(due)}>Start review</button>
          : tracked > 0
            ? <><small>{Number.isFinite(nextDue) ? `Next one in ${fmtInterval(nextDue - now)}` : 'All caught up'}</small>
              <button className="btn ghost" onClick={early}>Practise early anyway</button></>
            : <small>Read a few facts in your feed first.</small>}
      </div>
      <div className="panel">
        <h3>How it works</h3>
        <Curve />
        <p className="muted">Without review, memory of a new fact fades fast (grey). Each successful recall resets it and makes it fade more slowly (colour), so reviews get further apart: minutes → 1 day → a few days → weeks → months.</p>
      </div>
    </div>
  );
}

/** Illustrative forgetting curve with spaced reviews. */
function Curve() {
  const W = 300, H = 110;
  const y = (r: number) => 8 + (1 - r) * (H - 24);
  const seg = (x0: number, x1: number, s: number) => {
    const pts: string[] = [];
    for (let x = x0; x <= x1; x += 4) {
      const r = Math.pow(1 + (19 / 81) * ((x - x0) / s), -0.5);
      pts.push(`${x},${y(r).toFixed(1)}`);
    }
    return pts.join(' ');
  };
  const xs = [0, 30, 80, 160, 300];
  const st = [22, 60, 150, 400];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="curve" role="img" aria-label="Forgetting curve flattening with each spaced review">
      <polyline points={seg(0, W, 22)} fill="none" stroke="#5a5a6e" strokeWidth="2" strokeDasharray="4 4" />
      {st.map((s, i) => <polyline key={i} points={seg(xs[i], xs[i + 1], s)} fill="none" stroke="#8b7bff" strokeWidth="2.5" />)}
      {xs.slice(1, -1).map((x) => <line key={x} x1={x} x2={x} y1={y(1)} y2={H - 14} stroke="#ff5c8a" strokeWidth="1" strokeDasharray="2 3" />)}
      <text x="0" y={H - 2} fill="#9a9ab0" fontSize="10">time →</text>
      <text x={W} y={H - 2} fill="#ff5c8a" fontSize="10" textAnchor="end">┊ = recall</text>
    </svg>
  );
}
