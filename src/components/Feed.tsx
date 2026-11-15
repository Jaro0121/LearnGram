import { useCallback, useEffect, useRef, useState } from 'react';
import { CAT } from '../data/categories';
import { dwell, markSeen } from '../lib/actions';
import { buildBatch } from '../lib/feed';
import { getState, useStore } from '../lib/store';
import type { Item } from '../lib/types';
import { FactCard, ReviewCard, TriviaCard } from './Cards';
import { Icon } from './Icon';

/** How long a card must stay on screen before it counts as read. */
const READ_MS = 1200;

export function Feed({ filter = null, visible = true, onBack }: { filter?: string | null; visible?: boolean; onBack?: () => void }) {
  const s = useStore();
  const [items, setItems] = useState<Item[]>(() => buildBatch(getState(), [], filter, 6));
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);
  activeRef.current = active;

  // Track which card is on screen.
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting && e.intersectionRatio >= 0.6) setActive(Number((e.target as HTMLElement).dataset.i));
      }
    }, { root, threshold: 0.6 });
    root.querySelectorAll('.card').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items]);

  // Keep the feed endless.
  useEffect(() => {
    if (active >= items.length - 3) setItems((prev) => [...prev, ...buildBatch(getState(), prev, filter, 5)]);
  }, [active, items.length, filter]);

  // Count reads + feed dwell time to the recommender.
  const activeItem = items[active];
  const activeKey = activeItem?.key;
  useEffect(() => {
    if (!visible || !activeItem || activeItem.kind !== 'fact') return;
    const fact = activeItem.fact;
    const t0 = Date.now();
    const timer = setTimeout(() => markSeen(fact), READ_MS);
    return () => { clearTimeout(timer); dwell(fact, Date.now() - t0); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, visible]);

  // A like re-ranks everything that is not on screen yet, so similar cards come next.
  const onLiked = useCallback(() => {
    setItems((prev) => {
      const keep = prev.slice(0, activeRef.current + 1);
      return [...keep, ...buildBatch(getState(), keep, filter, 5)];
    });
  }, [filter]);

  const onNext = useCallback(() => {
    const el = ref.current;
    if (el) el.scrollBy({ top: el.clientHeight, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      const el = ref.current;
      if (!el || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
      e.preventDefault();
      el.scrollBy({ top: e.key === 'ArrowDown' ? el.clientHeight : -el.clientHeight, behavior: 'smooth' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible]);

  const done = Math.min(s.day.count, s.goal);
  const pct = Math.round((done / s.goal) * 100);

  return (
    <div className="feed-wrap">
      <header className="feed-top">
        {onBack
          ? <button className="back" onClick={onBack} aria-label="Back"><Icon name="back" size={22} />{filter ? CAT[filter]?.name : ''}</button>
          : <span className="brand">LearnGram</span>}
        <div className="goal" title="Today's goal" data-testid="goal">
          <span>🔥 {s.streak.count}</span>
          <div className="goal-bar"><i style={{ width: pct + '%' }} /></div>
          <span>{done}/{s.goal}{done >= s.goal ? ' ✓' : ''}</span>
        </div>
      </header>
      <div className="feed" ref={ref} data-testid="feed">
        {items.map((it, i) =>
          it.kind === 'fact' ? <FactCard key={it.key} fact={it.fact} why={it.why} index={i} onLiked={onLiked} onNext={onNext} />
            : it.kind === 'review' ? <ReviewCard key={it.key} fact={it.fact} index={i} />
              : <TriviaCard key={it.key} trivia={it.trivia} index={i} />)}
        {items.length === 0 && <section className="card empty"><div className="card-body"><h2>Nothing here yet</h2><p>Try another category.</p></div></section>}
      </div>
      {active === 0 && items.length > 1 && <div className="hint" aria-hidden="true">Swipe up · double-tap to like</div>}
    </div>
  );
}
