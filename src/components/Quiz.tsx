import { useMemo, useState } from 'react';

/** Multiple-choice question. `options[0]` is the correct answer; order is shuffled once per mount. */
export function Quiz({ q, options, onAnswer }: { q: string; options: string[]; onAnswer: (correct: boolean) => void }) {
  const order = useMemo(() => {
    const a = options.map((_, i) => i);
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }, [options]);
  const [picked, setPicked] = useState<number | null>(null);

  return (
    <div className="quiz">
      <h2 className="quiz-q">{q}</h2>
      <div className="quiz-opts">
        {order.map((i) => {
          const cls = picked === null ? '' : i === 0 ? ' right' : i === picked ? ' wrong' : ' dim';
          return (
            <button key={i} className={'opt' + cls} disabled={picked !== null}
              onClick={() => { setPicked(i); onAnswer(i === 0); }}>
              {options[i]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
