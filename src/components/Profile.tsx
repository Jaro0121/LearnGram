import { useRef, useState } from 'react';
import { CAT, CATEGORIES } from '../data/categories';
import { currentStreak, getFact, toggleLike, toggleSave } from '../lib/actions';
import { isNative, openExternal, saveTextFile } from '../lib/native';
import { retrievability } from '../lib/srs';
import { exportBackup, importBackup, resetAll, update, useStore } from '../lib/store';
import { toast } from '../lib/toast';
import type { Fact } from '../lib/types';
import { factUrl } from './Cards';


/** The web build ships privacy.html next to the app; the Android app opens the hosted copy. */
const PRIVACY_URL = 'https://jaro0121.github.io/LearnGram/privacy.html';

export function Profile({ now }: { now: number }) {
  const s = useStore();
  const [tab, setTab] = useState<'liked' | 'saved'>('liked');
  const fileRef = useRef<HTMLInputElement>(null);
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

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      importBackup(await file.text());
      toast('Backup restored');
    } catch (e) {
      toast((e as Error).message);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="page">
      <h1>{s.name ? `Hi, ${s.name}` : 'Your profile'}</h1>
      <div className="stats">
        <div><b>🔥 {currentStreak(s, now)}</b><span>day streak</span></div>
        <div><b data-testid="learned">{Object.keys(s.seen).length}</b><span>facts learned</span></div>
        <div><b>{s.xp}</b><span>XP</span></div>
        <div><b>{strength}%</b><span>memory strength</span></div>
        <div><b>{total ? acc + '%' : '–'}</b><span>recall accuracy</span></div>
        <div><b>{mastered}</b><span>mastered</span></div>
      </div>

      <div className="panel">
        <h2 className="h3">Your feed is tuned to</h2>
        {cats.map(({ c, v }) => (
          <div className="bar-row" key={c.id}>
            <span>{c.emoji} {c.name}</span>
            <div className="bar" role="meter" aria-label={c.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((v / maxV) * 100)}>
              <i style={{ width: `${Math.max(3, (v / maxV) * 100)}%`, background: `linear-gradient(90deg, ${c.from}, ${c.to})` }} />
            </div>
          </div>
        ))}
        {tags.length > 0 && <div className="tags big" data-testid="top-tags">{tags.map(([t]) => <span key={t}>#{t}</span>)}</div>}
        <p className="muted">Likes, saves and reading time push topics up; quick skips and “Less” push them down.</p>
      </div>

      <div className="panel">
        <div className="seg" role="tablist">
          <button role="tab" aria-selected={tab === 'liked'} className={tab === 'liked' ? 'on' : ''} onClick={() => setTab('liked')}>♥ Liked ({Object.keys(s.liked).length})</button>
          <button role="tab" aria-selected={tab === 'saved'} className={tab === 'saved' ? 'on' : ''} onClick={() => setTab('saved')}>🔖 Saved ({Object.keys(s.saved).length})</button>
        </div>
        {list.length === 0 && <p className="muted">Nothing here yet — double-tap a card to like it.</p>}
        {list.map((f) => (
          <details className="item" key={f.id}>
            <summary><span>{CAT[f.cat]?.emoji}</span>{f.title}</summary>
            <p>{f.text}</p>
            <div className="item-acts">
              {factUrl(f) && <button className="link" onClick={() => void openExternal(factUrl(f)!)}>Learn more ↗</button>}
              <button onClick={() => (tab === 'liked' ? toggleLike(f) : toggleSave(f))}>Remove</button>
            </div>
          </details>
        ))}
      </div>

      <div className="panel">
        <h2 className="h3">Settings</h2>
        <label className="toggle">
          <span>Live content<small>Pull extra cards from Wikipedia and Open Trivia DB when online</small></span>
          <input type="checkbox" checked={s.live} onChange={(e) => update((x) => { x.live = e.target.checked; })} />
        </label>
        <button className="btn ghost" onClick={() => update((x) => { x.onboarded = false; })}>Retake questionnaire</button>
      </div>

      <div className="panel">
        <h2 className="h3">Your data</h2>
        <p className="muted" style={{ marginTop: 0 }}>Everything is stored only on this device. Make a backup before switching phones or clearing your browser.</p>
        <button className="btn ghost" onClick={() => {
          saveTextFile(`learngram-backup-${new Date().toISOString().slice(0, 10)}.json`, exportBackup())
            .then(() => { if (!isNative) toast('Backup downloaded'); })
            .catch(() => toast('Could not save the backup'));
        }}>Download backup</button>
        <button className="btn ghost" onClick={() => fileRef.current?.click()}>Restore from backup</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => void onImport(e.target.files?.[0])} />
        <button className="btn danger" onClick={() => { if (confirm('Erase all progress, likes and settings?')) resetAll(); }}>Reset everything</button>
      </div>

      <div className="panel about">
        <h2 className="h3">About</h2>
        <p className="muted" style={{ marginTop: 0 }}>LearnGram {__APP_VERSION__}. No account, no ads, no tracking.</p>
        <p className="muted">Live text from Wikipedia (CC BY-SA 4.0) · trivia from Open Trivia DB (CC BY-SA 4.0).</p>
        <button className="btn ghost" onClick={() => void openExternal(isNative ? PRIVACY_URL : new URL('privacy.html', location.href).href)}>Privacy policy</button>
      </div>
    </div>
  );
}
