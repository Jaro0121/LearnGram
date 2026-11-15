import { useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { CAT } from '../data/categories';
import { answerReview, answerTrivia, showLess, toggleLike, toggleSave } from '../lib/actions';
import { fmtInterval } from '../lib/srs';
import { useStore } from '../lib/store';
import { toast } from '../lib/toast';
import type { Fact, Trivia } from '../lib/types';
import { Icon } from './Icon';
import { Quiz } from './Quiz';

const bg = (cat: string) => ({ '--from': CAT[cat]?.from ?? '#222', '--to': CAT[cat]?.to ?? '#555' }) as CSSProperties;
export const factUrl = (f: Fact) => f.url ?? (f.wiki ? `https://en.wikipedia.org/wiki/${encodeURIComponent(f.wiki.replace(/ /g, '_'))}` : undefined);

async function share(f: Fact) {
  const text = `${f.title} — ${f.text}`;
  try {
    if (navigator.share) await navigator.share({ title: 'LearnGram', text, url: factUrl(f) });
    else { await navigator.clipboard.writeText(text); toast('Copied to clipboard'); }
  } catch { /* user cancelled */ }
}

export function FactCard({ fact, why, index, onLiked, onNext }: {
  fact: Fact; why: string; index: number; onLiked: () => void; onNext: () => void;
}) {
  const s = useStore();
  const liked = !!s.liked[fact.id];
  const saved = !!s.saved[fact.id];
  const [burst, setBurst] = useState(0);
  const lastTap = useRef(0);
  const c = CAT[fact.cat];
  const url = factUrl(fact);

  const like = () => { toggleLike(fact); if (!liked) onLiked(); };
  const onTap = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('button,a')) return;
    const now = Date.now();
    if (now - lastTap.current < 320) {
      setBurst(now);
      if (!liked) like();
      lastTap.current = 0;
    } else lastTap.current = now;
  };

  return (
    <section className={'card' + (fact.img ? ' has-img' : '')} data-i={index} data-id={fact.id} data-cat={fact.cat} style={bg(fact.cat)} onClick={onTap}>
      {fact.img && <div className="card-img" style={{ backgroundImage: `url("${fact.img}")` }} />}
      <div className="card-emoji" aria-hidden="true">{c?.emoji}</div>
      <div className="card-body">
        <span className="chip">{c?.emoji} {c?.name}{fact.live && <em> · Wikipedia</em>}</span>
        <h2>{fact.title}</h2>
        <p>{fact.text}</p>
        <div className="tags">{fact.tags.slice(0, 4).map((t) => <span key={t}>#{t}</span>)}</div>
        <div className="why">✨ {why}</div>
        {url && <a className="more" href={url} target="_blank" rel="noreferrer">Learn more ↗</a>}
      </div>
      <div className="rail">
        <button className={'act' + (liked ? ' on-like' : '')} aria-label="Like" aria-pressed={liked} onClick={like}>
          <Icon name="heart" filled={liked} /><span>{liked ? 'Liked' : 'Like'}</span>
        </button>
        <button className={'act' + (saved ? ' on-save' : '')} aria-label="Save" aria-pressed={saved}
          onClick={() => { toggleSave(fact); if (!saved) toast('Saved to your profile'); }}>
          <Icon name="bookmark" filled={saved} /><span>{saved ? 'Saved' : 'Save'}</span>
        </button>
        <button className="act" aria-label="Share" onClick={() => share(fact)}>
          <Icon name="share" /><span>Share</span>
        </button>
        <button className="act" aria-label="Show less like this"
          onClick={() => { showLess(fact); toast('Got it — fewer like this'); onNext(); }}>
          <Icon name="less" /><span>Less</span>
        </button>
      </div>
      {burst > 0 && <div key={burst} className="burst" aria-hidden="true"><Icon name="heart" filled size={120} /></div>}
    </section>
  );
}

export function ReviewCard({ fact, index, inFeed = true, onAnswered }: { fact: Fact; index?: number; inFeed?: boolean; onAnswered?: () => void }) {
  const [res, setRes] = useState<{ ok: boolean; gap: number } | null>(null);
  const c = CAT[fact.cat];
  if (!fact.quiz) return null;
  return (
    <section className={'card quiz-card' + (inFeed ? '' : ' solo')} data-i={index} data-kind="review" data-id={fact.id} style={bg(fact.cat)}>
      <div className="card-body">
        <span className="chip">🧠 Quick recall · {c?.name}</span>
        <Quiz q={fact.quiz.q} options={fact.quiz.options} onAnswer={(ok) => { setRes({ ok, gap: answerReview(fact, ok) }); onAnswered?.(); }} />
        {res && (
          <div className={'result ' + (res.ok ? 'ok' : 'bad')}>
            <strong>{res.ok ? 'Correct! +10 XP' : 'Not quite — now it will stick better'}</strong>
            <p>{fact.text}</p>
            <small>Next recall in {fmtInterval(res.gap)}{inFeed ? ' · swipe up to continue' : ''}</small>
          </div>
        )}
      </div>
    </section>
  );
}

export function TriviaCard({ trivia, index }: { trivia: Trivia; index: number }) {
  const [ok, setOk] = useState<boolean | null>(null);
  const c = CAT[trivia.cat];
  return (
    <section className="card quiz-card" data-i={index} data-kind="trivia" style={bg(trivia.cat)}>
      <div className="card-body">
        <span className="chip">🎯 Trivia challenge · {c?.name}</span>
        <Quiz q={trivia.q} options={trivia.options} onAnswer={(r) => { setOk(r); answerTrivia(r); }} />
        {ok !== null && (
          <div className={'result ' + (ok ? 'ok' : 'bad')}>
            <strong>{ok ? 'Correct! +10 XP' : `Answer: ${trivia.options[0]}`}</strong>
            <small>Question from Open Trivia DB · swipe up to continue</small>
          </div>
        )}
      </div>
    </section>
  );
}
