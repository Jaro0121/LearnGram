# LearnGram

A swipeable, full-screen feed of short facts — like Reels or TikTok, but built so you actually remember what you scroll past.

- **Vertical swipe feed** with like (button or double-tap), save, share and "show less"
- **Personal questionnaire** on first launch: interests, daily goal, how much you want to remember, how adventurous the feed should be
- **10 categories, 100 hand-written facts** bundled for offline use, each with a recall question
- **Like-driven recommendations**: cards similar to what you liked move to the front
- **Spaced-repetition recall cards** slipped into the feed right before you would forget
- **Live content** (optional, when online): related Wikipedia articles and Open Trivia DB questions
- **Installable mobile app (PWA)**: works offline, add it to your home screen; all data stays on your device

## Run it

```bash
npm install
npm run dev        # open the printed Network URL on your phone (same Wi-Fi)
npm test           # unit tests (scheduler, recommender, feed)
npm run build && npm run e2e   # end-to-end test in a phone-sized Chromium (needs Playwright)
```

**Put it on your phone:** push to `main` and enable *Settings → Pages → Source: GitHub Actions*. The included
workflow builds and deploys the app; open the Pages URL on your phone and choose *Add to Home Screen*.
To ship it to the app stores later, the `dist/` build can be wrapped with [Capacitor](https://capacitorjs.com/).

## How the learning works

The design follows the techniques with the strongest evidence in learning research:

| Principle | What the research says | What LearnGram does |
| --- | --- | --- |
| **Retrieval practice** | Recalling a fact strengthens memory more than re-reading it; classroom quizzing improves learning by about half a standard deviation. | Every bundled fact has a question. Seen facts come back as "Quick recall" cards, not as repeats. |
| **Spacing** | Spread-out practice beats massed practice by roughly half a standard deviation on later tests. | Recalls are scheduled at growing gaps: ~10 min → 1 day → days → weeks → months. |
| **Review just before forgetting** | Modern schedulers (FSRS) model memory as a power-law forgetting curve and review when predicted recall drops to a target, needing fewer reviews than fixed-interval schemes like SM-2. | `src/lib/srs.ts` tracks stability and difficulty per fact and schedules the next recall when predicted recall reaches ~90%. Harder-won recalls extend the interval more. |
| **Interleaving** | Mixing topics helps in many (not all) settings. | The feed avoids long runs of one category. |
| **Small daily doses** | Follows from spacing. | A daily goal of 5–20 cards and a streak. |

The scheduler is *inspired by* FSRS (same forgetting-curve shape and the stability/difficulty idea) but is a small,
simplified implementation — it is not the full trained FSRS model.

## How recommendations work

`src/lib/recommender.ts` is a content-based recommender. Each card has a category and tags; your profile holds an
affinity score for each.

| Signal | Effect |
| --- | --- |
| Like / double-tap | strong boost for the card's tags and category |
| Save | stronger boost |
| Reading for 7 s+ | small boost |
| Swiping away in under 1 s | small penalty |
| "Less" | strong penalty, card hidden |

Candidates are ranked by *questionnaire interest + category affinity + tag affinity − repetition penalty + exploration noise*.
A like immediately re-ranks every card that is not on screen yet. Each card shows why it was picked
("Because you like #planets"), and the Profile tab shows what the feed is currently tuned to.
Tags are shared across categories, so liking memory facts in Psychology also surfaces the sleep-and-memory fact in Body & Health.

## Content sources

- **Bundled deck** — `src/data/facts.ts`, written for this app, each fact linked to its Wikipedia article.
- **Wikipedia** — MediaWiki Action API `morelike:` search finds articles similar to your likes (text CC BY-SA).
- **Open Trivia DB** — free multiple-choice questions, no API key (CC BY-SA 4.0).

Live content can be switched off in Profile → Settings; the app is fully usable without it.

## Project layout

```
src/data/        categories and the fact deck
src/lib/srs.ts           spaced-repetition scheduler
src/lib/recommender.ts   like-based ranking
src/lib/feed.ts          mixes new cards, due recalls and live content
src/lib/live.ts          Wikipedia + Open Trivia DB clients
src/lib/store.ts         state, persisted in localStorage
src/components/  onboarding, feed, cards, explore, review, profile
e2e/smoke.mjs    end-to-end test
```

## Research references

- Dunlosky et al. (2013), *Improving Students' Learning With Effective Learning Techniques*; overview: <https://firth.substack.com/p/jonathan-firth-s-memory-metacognition-updates-15-dunlosky-et-al-s-list-of-strategies-1347143>
- Weinstein, Madan & Sumeracki (2018), *Teaching the science of learning*: <https://cognitiveresearchjournal.springeropen.com/articles/10.1186/s41235-017-0087-y>
- University of Minnesota, *Spaced and interleaved practice improves recall*: <https://cei.umn.edu/teaching-resources/leveraging-learning-sciences/spaced-and-interleaved-practice-improves-recall>
- Anki manual, *What spaced repetition algorithm does Anki use?* (SM-2 and FSRS): <https://faqs.ankiweb.net/what-spaced-repetition-algorithm>
- RemNote, *The FSRS spaced repetition algorithm*: <https://help.remnote.com/en/articles/9124137-the-fsrs-spaced-repetition-algorithm>
