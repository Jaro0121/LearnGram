import { useState } from 'react';
import { CAT, CATEGORIES } from '../data/categories';
import { getFact, toggleLike, toggleSave } from '../lib/actions';
import { retrievability } from '../lib/srs';
import { resetAll, update, useStore } from '../lib/store';
import type { Fact } from '../lib/types';
import { factUrl } from './Cards';

export function Profile({ now }: { now: number }) {
  const s = useStore();
  const [tab, setTab] = useState<'liked' | 'saved'>('liked');
  const mems = Object.values(s.mem);
  const strength = mems.length ? Math.round((mems.reduce((a, m) => a + retrievability(m, now), 0) / mems.length) * 100) : 0;
  const mastered = mems.filter((m) => m.s >= 21).length;
  const total = s.quiz.right + s.quiz.wrong;
  const acc = total ? Math.round((s.quiz.right / total) * 100) : 0;

  // What the recommender currently believes about you.
  const catScore = (id: string) => (s.interests.includes(id) ? 1 : 0.15) + Math.tanh((s.cat[id] ?? 0) / 3);
  const cats = CATEGORIES.map((c) => ({ c, v: catScore(c.id) })).sort((a, b) => b.v - a.v);
  const maxV = Math.max(...cats.map((x) => x.v), 0.01);
  const tags = Object.entries(s.tag).filter(([, v]) => v > 0.5).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const list = Object.entries(tab === 'liked' ? s.liked : s.saved).sort((a, b) => b[1] - a[1])
    .map(([id]) => getFact(id)).filter((f): f is Fact => !!f);

  return (
    <div className="page">
      <h1>{s.name ? `Hi, ${s.name}` : 'Your profile'}</h1>
      <div className="stats">
        <div><b>🔥 {s.streak.count}</b><span>day streak</span></div>
        <div><b data-testid="learned">{Object.keys(s.seen).length}</b><span>facts learned</span></div>
        <div><b>{s.xp}</b><span>XP</span></div>
        <div><b>{strength}%</b><span>memory strength</span></div>
        <div><b>{total ? acc + '%' : '–'}</b><span>recall accuracy</span></div>
        <div><b>{mastered}</b><span>mastered</span></div>
      </div>

      <div className="panel">
        <h3>Your feed is tuned to</h3>
        {cats.map(({ c, v }) => (
          <div className="bar-row" key={c.id}>
            <span>{c.emoji} {c.name}</span>
            <div className="bar"><i style={{ width: `${Math.max(3, (v / maxV) * 100)}%`, background: `linear-gradient(90deg, ${c.from}, ${c.to})` }} /></div>
          </div>
        ))}
        {tags.length > 0 && <div className="tags big" data-testid="top-tags">{tags.map(([t]) => <span key={t}>#{t}</span>)}</div>}
        <p className="muted">Likes, saves and reading time push topics up; quick skips and “Less” push them down.</p>
      </div>

      <div className="panel">
        <div className="seg">
          <button className={tab === 'liked' ? 'on' : ''} onClick={() => setTab('liked')}>♥ Liked ({Object.keys(s.liked).length})</button>
          <button className={tab === 'saved' ? 'on' : ''} onClick={() => setTab('saved')}>🔖 Saved ({Object.keys(s.saved).length})</button>
        </div>
        {list.length === 0 && <p className="muted">Nothing here yet — double-tap a card to like it.</p>}
        {list.map((f) => (
          <details className="item" key={f.id}>
            <summary><span>{CAT[f.cat]?.emoji}</span>{f.title}</summary>
            <p>{f.text}</p>
            <div className="item-acts">
              {factUrl(f) && <a href={factUrl(f)} target="_blank" rel="noreferrer">Learn more ↗</a>}
              <button onClick={() => (tab === 'liked' ? toggleLike(f) : toggleSave(f))}>Remove</button>
            </div>
          </details>
        ))}
      </div>

      <div className="panel">
        <h3>Settings</h3>
        <label className="toggle">
          <span>Live content<small>Pull extra cards from Wikipedia and Open Trivia DB when online</small></span>
          <input type="checkbox" checked={s.live} onChange={(e) => update((x) => { x.live = e.target.checked; })} />
        </label>
        <button className="btn ghost" onClick={() => update((x) => { x.onboarded = false; })}>Retake questionnaire</button>
        <button className="btn danger" onClick={() => { if (confirm('Erase all progress, likes and settings?')) resetAll(); }}>Reset everything</button>
      </div>
      <p className="muted credits">Live text from Wikipedia (CC BY-SA) · trivia from Open Trivia DB (CC BY-SA 4.0)</p>
    </div>
  );
}
