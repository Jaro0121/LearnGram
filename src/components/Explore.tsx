import { CATEGORIES } from '../data/categories';
import { FACTS } from '../data/facts';
import { useStore } from '../lib/store';

export function Explore({ onOpen }: { onOpen: (cat: string) => void }) {
  const s = useStore();
  return (
    <div className="page">
      <h1>Explore</h1>
      <p className="lead">Dive into one topic at a time.</p>
      <div className="cats">
        {CATEGORIES.map((c) => {
          const all = FACTS.filter((f) => f.cat === c.id);
          const seen = all.filter((f) => s.seen[f.id]).length;
          return (
            <button key={c.id} className="cat" style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }} onClick={() => onOpen(c.id)}>
              <span className="cat-e">{c.emoji}</span><strong>{c.name}</strong>
              <small>{seen}/{all.length} learned{s.interests.includes(c.id) ? ' · ★' : ''}</small>
              <div className="cat-bar"><i style={{ width: `${(seen / all.length) * 100}%` }} /></div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
