import { useState } from 'react';
import { CATEGORIES } from '../data/categories';
import { getState, requestPersistence, update, type RecallMode } from '../lib/store';

const GOALS = [
  { v: 5, t: 'Casual', d: '5 facts a day · about 2 minutes' },
  { v: 10, t: 'Regular', d: '10 facts a day · about 5 minutes' },
  { v: 20, t: 'Serious', d: '20 facts a day · about 10 minutes' },
];
const RECALL: { v: RecallMode; t: string; d: string }[] = [
  { v: 'light', t: 'Mostly browse', d: 'A recall question now and then' },
  { v: 'balanced', t: 'Balanced', d: 'Recommended — a quick recall every few cards' },
  { v: 'intense', t: 'Remember everything', d: 'Frequent recall for maximum retention' },
];
const EXPLORE = [
  { v: 0.05, t: 'Stick to my topics', d: 'Almost only what I picked' },
  { v: 0.15, t: 'Mostly my topics', d: 'With the occasional surprise' },
  { v: 0.4, t: 'Surprise me', d: 'Lots of variety from every category' },
];

export function Onboarding() {
  const s0 = getState();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(s0.name);
  const [interests, setInterests] = useState<string[]>(s0.interests);
  const [goal, setGoal] = useState(s0.goal);
  const [recall, setRecall] = useState<RecallMode>(s0.recall);
  const [explore, setExplore] = useState(s0.explore);
  const last = 4;

  const toggle = (id: string) => setInterests((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));
  const canNext = step !== 1 || interests.length >= 3;
  const next = () => {
    if (step < last) return setStep(step + 1);
    update((s) => { s.name = name.trim(); s.interests = interests; s.goal = goal; s.recall = recall; s.explore = explore; s.onboarded = true; });
    requestPersistence();
  };

  const choice = <T,>(opts: { v: T; t: string; d: string }[], cur: T, set: (v: T) => void) => (
    <div className="choices">
      {opts.map((o) => (
        <button key={String(o.v)} className={'choice' + (o.v === cur ? ' sel' : '')} aria-pressed={o.v === cur} onClick={() => set(o.v)}>
          <strong>{o.t}</strong><span>{o.d}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="onb">
      <div className="onb-dots">{Array.from({ length: last + 1 }, (_, i) => <i key={i} className={i <= step ? 'on' : ''} />)}</div>
      <div className="onb-main">
        {step === 0 && (<>
          <div className="onb-logo">📖</div>
          <h1>Welcome to LearnGram</h1>
          <p className="lead">Swipe through short facts like a video feed — except you actually remember them. Five quick questions set up your feed.</p>
          <label className="field">What should we call you? <em>(optional)</em>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={24} autoComplete="off" />
          </label>
        </>)}
        {step === 1 && (<>
          <h1>What are you curious about?</h1>
          <p className="lead">Pick at least 3. Your likes will fine-tune this later.</p>
          <div className="cats">
            {CATEGORIES.map((c) => (
              <button key={c.id} className={'cat' + (interests.includes(c.id) ? ' sel' : '')} aria-pressed={interests.includes(c.id)}
                style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }} onClick={() => toggle(c.id)}>
                <span className="cat-e">{c.emoji}</span><strong>{c.name}</strong><small>{c.blurb}</small>
              </button>
            ))}
          </div>
        </>)}
        {step === 2 && (<>
          <h1>How much each day?</h1>
          <p className="lead">Short daily sessions beat one long one — that is the spacing effect.</p>
          {choice(GOALS, goal, setGoal)}
        </>)}
        {step === 3 && (<>
          <h1>How much do you want to remember?</h1>
          <p className="lead">Recalling a fact strengthens memory far more than re-reading it. LearnGram slips recall questions into your feed just before you would forget.</p>
          {choice(RECALL, recall, setRecall)}
        </>)}
        {step === 4 && (<>
          <h1>Focused or adventurous?</h1>
          <p className="lead">How often should the feed leave your comfort zone?</p>
          {choice(EXPLORE, explore, setExplore)}
        </>)}
      </div>
      <div className="onb-foot">
        {step > 0 && <button className="btn ghost" onClick={() => setStep(step - 1)}>Back</button>}
        <button className="btn primary" disabled={!canNext} onClick={next}>
          {step === last ? 'Start learning' : step === 1 && !canNext ? `Pick ${3 - interests.length} more` : 'Continue'}
        </button>
      </div>
    </div>
  );
}
