import { useEffect, useState } from 'react';
import { Explore } from './components/Explore';
import { Feed } from './components/Feed';
import { Icon } from './components/Icon';
import { Onboarding } from './components/Onboarding';
import { Profile } from './components/Profile';
import { Review } from './components/Review';
import { dueFacts } from './lib/feed';
import { useStore } from './lib/store';
import { onToast } from './lib/toast';

type Tab = 'feed' | 'explore' | 'review' | 'profile';
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'feed', label: 'Feed', icon: 'home' },
  { id: 'explore', label: 'Explore', icon: 'grid' },
  { id: 'review', label: 'Review', icon: 'repeat' },
  { id: 'profile', label: 'Profile', icon: 'user' },
];

export default function App() {
  const s = useStore();
  const [tab, setTab] = useState<Tab>('feed');
  const [cat, setCat] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [msg, setMsg] = useState('');

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 15_000); return () => clearInterval(t); }, []);
  useEffect(() => { setNow(Date.now()); }, [tab]);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const off = onToast((m) => { setMsg(m); clearTimeout(t); t = setTimeout(() => setMsg(''), 1800); });
    return () => { off(); clearTimeout(t); };
  }, []);

  if (!s.onboarded) return <div className="app"><Onboarding /></div>;

  const due = dueFacts(s, now).length;
  return (
    <div className="app">
      {/* The main feed stays mounted so you return to the same card. */}
      <div className="screen" hidden={tab !== 'feed'}><Feed visible={tab === 'feed'} /></div>
      {tab === 'explore' && (cat
        ? <div className="screen"><Feed key={cat} filter={cat} onBack={() => setCat(null)} /></div>
        : <div className="screen scroll"><Explore onOpen={setCat} /></div>)}
      {tab === 'review' && <div className="screen scroll"><Review now={now} /></div>}
      {tab === 'profile' && <div className="screen scroll"><Profile now={now} /></div>}

      <nav className="nav">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} aria-current={tab === t.id} onClick={() => { setTab(t.id); if (t.id === 'explore' && tab === 'explore') setCat(null); }}>
            <Icon name={t.icon} size={24} />
            <span>{t.label}</span>
            {t.id === 'review' && due > 0 && <b className="badge" data-testid="due-badge">{due}</b>}
          </button>
        ))}
      </nav>
      {msg && <div className="toast" role="status">{msg}</div>}
    </div>
  );
}
