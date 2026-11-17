// End-to-end test on a phone-sized viewport. Run `npm run build` first.
// External APIs are mocked so the test is deterministic; LIVE=1 uses the real Wikipedia / Open Trivia DB.
// STORE_SHOTS=1 also writes the app-store / manifest screenshots to public/screenshots.
import { createRequire } from 'node:module';
const { chromium, devices } = createRequire(import.meta.url)('playwright'); // npm i -D playwright, or a global install
import { preview } from 'vite';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';

const LIVE = !!process.env.LIVE;
const STORE = !!process.env.STORE_SHOTS;
const SHOTS = process.env.SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const STORE_DIR = new URL('../public/screenshots/', import.meta.url).pathname;
if (STORE) mkdirSync(STORE_DIR, { recursive: true });
const STORE_NAMES = { '02-interests': 'interests', '05-after-like': 'feed', '07-recall': 'recall', '10-profile': 'profile' };
const server = await preview({ preview: { port: 4317, strictPort: true }, logLevel: 'silent' });
const url = 'http://localhost:4317/';
const browser = await chromium.launch();
const ctx = await browser.newContext(STORE
  ? { viewport: { width: 360, height: 740 }, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true, userAgent: devices['Pixel 7'].userAgent, acceptDownloads: true }
  : { ...devices['Pixel 7'], acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  // Offline reloads and real-API rate limits legitimately log failed requests.
  if (m.type() === 'error' && !/Failed to load resource|net::ERR_INTERNET_DISCONNECTED/.test(m.text())) errors.push(m.text());
});

let wikiCalls = 0;
ctx.on('request', (r) => { if (LIVE && r.url().startsWith('https://en.wikipedia.org/')) wikiCalls++; });
if (process.env.DEBUG) ctx.on('response', (r) => { if (/wikipedia\.org\/w\/api|opentdb/.test(r.url())) console.log('   ', r.status(), r.request().method(), r.url().slice(0, 60)); });
if (!LIVE) await ctx.route('https://en.wikipedia.org/**', (route) => {
  wikiCalls++;
  const seed = decodeURIComponent(new URL(route.request().url()).searchParams.get('gsrsearch') ?? '');
  route.fulfill({ json: { query: { pages: [1, 2, 3].map((i) => ({
    pageid: 9000 + wikiCalls * 10 + i, index: i, title: `Live article ${wikiCalls}.${i}`,
    extract: `This is a mocked Wikipedia extract related to ${seed}. It is long enough to pass the quality filter used by the app.`,
    fullurl: 'https://en.wikipedia.org/wiki/Mock',
  })) } } });
});
if (!LIVE) await ctx.route('https://opentdb.com/**', (route) => route.fulfill({ json: { response_code: 0, results: [] } }));

const shot = async (name) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
  if (STORE && STORE_NAMES[name]) await page.screenshot({ path: `${STORE_DIR}${STORE_NAMES[name]}.png` });
};
const step = (m) => console.log('•', m);
const activeCard = () => page.evaluate(() => {
  const feed = [...document.querySelectorAll('[data-testid=feed]')].find((f) => f.offsetParent);
  const i = Math.round(feed.scrollTop / feed.clientHeight);
  const el = feed.children[i];
  return { i, id: el.dataset.id, cat: el.dataset.cat, kind: el.dataset.kind ?? 'fact', title: el.querySelector('h2')?.textContent };
});
const swipe = async () => {
  const before = (await activeCard()).i;
  await page.evaluate(() => {
    const feed = [...document.querySelectorAll('[data-testid=feed]')].find((f) => f.offsetParent);
    feed.scrollBy({ top: feed.clientHeight, behavior: 'instant' });
  });
  await page.waitForFunction((b) => {
    const feed = [...document.querySelectorAll('[data-testid=feed]')].find((f) => f.offsetParent);
    return Math.round(feed.scrollTop / feed.clientHeight) === b + 1;
  }, before);
};
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('learngram:v1')));

try {
  step('questionnaire');
  await page.goto(url);
  await page.getByPlaceholder('Your name').fill('Sam');
  await shot('01-welcome');
  await page.getByRole('button', { name: 'Continue' }).click();
  assert.ok(await page.getByRole('button', { name: 'Pick 3 more' }).isDisabled(), 'needs 3 interests');
  for (const n of ['Space & Physics', 'Psychology', 'Math & Logic']) await page.getByRole('button', { name: n }).click();
  await shot('02-interests');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: /Casual/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: /Remember everything/ }).click();
  await shot('03-recall');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: /Stick to my topics/ }).click();
  await page.getByRole('button', { name: 'Start learning' }).click();

  step('feed shows cards from chosen interests');
  await page.waitForSelector('.card h2');
  const first = await activeCard();
  assert.ok(['space', 'mind', 'math'].includes(first.cat), `first card from interests, got ${first.cat}`);
  await page.waitForTimeout(1500);
  await shot('04-feed');
  assert.equal(Object.keys((await state()).seen).length, 1, 'reading a card counts it as learned');
  assert.match(await page.getByTestId('goal').first().innerText(), /1\/5/);

  step('likes re-rank the upcoming cards');
  const card = page.locator(`.card[data-id="${first.id}"]`);
  await card.getByRole('button', { name: 'Like', exact: true }).click();
  let st = await state();
  assert.ok(st.liked[first.id], 'like stored');
  assert.ok(st.cat[first.cat] > 0, 'category affinity raised');
  const firstTags = await card.locator('.tags span').allInnerTexts();
  await swipe();
  const second = await activeCard();
  const why = await page.locator(`.card[data-id="${second.id}"] .why`).innerText();
  const secondTags = await page.locator(`.card[data-id="${second.id}"] .tags span`).allInnerTexts();
  assert.ok(firstTags.some((t) => secondTags.includes(t)), `next card shares a tag with the liked one (${firstTags} vs ${secondTags})`);
  assert.match(why, /Because you like #/);
  await page.waitForTimeout(1400);
  await shot('05-after-like');

  step('double-tap likes, save works');
  await page.locator(`.card[data-id="${second.id}"]`).dblclick({ position: { x: 120, y: 260 } });
  await page.locator(`.card[data-id="${second.id}"]`).getByRole('button', { name: 'Save', exact: true }).click();
  st = await state();
  assert.ok(st.liked[second.id] && st.saved[second.id], 'double-tap like + save stored');

  step('live Wikipedia cards join the feed');
  let sawLive = false;
  // The real Wikipedia API may rate-limit shared IPs, so LIVE mode gives it longer.
  for (let i = 0; i < (LIVE ? 60 : 24) && !sawLive; i++) {
    await swipe();
    const c = await activeCard();
    if (c.kind === 'fact') await page.waitForTimeout(1300);
    if (c.id?.startsWith('w:')) { sawLive = true; await shot('06-live'); }
  }
  assert.ok(wikiCalls > 0, 'Wikipedia was queried');
  assert.ok(sawLive, 'a live card appeared');

  step('due facts come back as recall cards');
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('learngram:v1'));
    for (const m of Object.values(s.mem)) { m.due -= 3600_000; m.last -= 3600_000; }
    localStorage.setItem('learngram:v1', JSON.stringify(s));
  });
  await page.reload();
  await page.waitForSelector('.card h2');
  const dueN = Number(await page.getByTestId('due-badge').innerText());
  assert.ok(dueN >= 2, `review badge shows due facts (${dueN})`);
  let c = await activeCard();
  for (let i = 0; i < 4 && c.kind !== 'review'; i++) { await page.waitForTimeout(1300); await swipe(); c = await activeCard(); }
  assert.equal(c.kind, 'review', 'recall card appears in the feed (intense = every 2 cards)');
  const qcard = page.locator('.feed > .card').nth(c.i);
  const before = (await state()).mem[c.id];
  await qcard.locator('.opt').first().click();
  await page.waitForSelector('.result');
  await shot('07-recall');
  const after = (await state()).mem[c.id];
  assert.ok(after.last > before.last && after.due !== before.due, 'answer rescheduled the fact');

  step('review tab session');
  await page.getByRole('button', { name: /Review/ }).click();
  await shot('08-review');
  const n = Number(await page.getByTestId('due-count').innerText());
  assert.ok(n >= 1);
  // Sessions hold up to 10 cards; keep going until nothing is due.
  while (Number(await page.getByTestId('due-count').innerText()) > 0) {
    const left = Number(await page.getByTestId('due-count').innerText());
    await page.getByRole('button', { name: 'Start review' }).click();
    for (let i = 0; i < Math.min(left, 10); i++) {
      assert.ok(await page.getByRole('button', { name: /^(Next|Finish)$/ }).isDisabled(), 'must answer first');
      await page.locator('.review-run .opt').first().click();
      await page.getByRole('button', { name: /^(Next|Finish)$/ }).click();
    }
    await page.getByText('Session complete').waitFor();
    await page.getByRole('button', { name: 'Done' }).click();
  }
  assert.equal(await page.getByTestId('due-count').innerText(), '0');

  step('explore a category');
  await page.getByRole('button', { name: 'Explore' }).click();
  await shot('09-explore');
  await page.getByRole('button', { name: /Geography/ }).click();
  await page.waitForSelector('.screen:not([hidden]) .card h2');
  assert.equal((await activeCard()).cat, 'geography');
  await page.getByRole('button', { name: 'Back' }).click();

  step('profile reflects progress and survives reload');
  await page.getByRole('button', { name: 'Profile' }).click();
  await page.getByText('Hi, Sam').waitFor();
  const learned = Number(await page.getByTestId('learned').innerText());
  assert.ok(learned >= 5, `facts learned shown (${learned})`);
  assert.ok((await page.getByTestId('top-tags').innerText()).includes('#'), 'liked tags listed');
  await page.getByRole('tab', { name: /Liked \(2\)/ }).waitFor();
  await shot('10-profile');
  await page.reload();
  await page.getByRole('button', { name: 'Profile' }).click();
  assert.equal(Number(await page.getByTestId('learned').innerText()), learned);

  step('backup download and restore');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download backup' }).click()]);
  const backupPath = await dl.path();
  const backup = JSON.parse(readFileSync(backupPath, 'utf8'));
  assert.equal(backup.app, 'LearnGram');
  assert.equal(Object.keys(backup.state.seen).length, learned);
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Reset everything' }).click();
  await page.getByText('Welcome to LearnGram').waitFor();
  await page.evaluate((b) => localStorage.setItem('learngram:v1', JSON.stringify(b.state)), backup);
  await page.reload();
  await page.getByRole('button', { name: 'Profile' }).click();
  await page.getByText('Hi, Sam').waitFor();
  await page.locator('input[type=file]').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"nope":1}') });
  await page.getByText('That file is not a LearnGram backup.').waitFor();
  await page.locator('input[type=file]').setInputFiles(backupPath);
  await page.getByText('Backup restored').waitFor();
  assert.equal(Number(await page.getByTestId('learned').innerText()), learned);

  step('privacy policy and review shortcut');
  const priv = await ctx.request.get(url + 'privacy.html');
  assert.equal(priv.status(), 200);
  assert.match(await priv.text(), /no tracking/);
  await page.goto(url + '?tab=review');
  await page.getByTestId('due-count').waitFor();

  step('works offline after the first visit');
  await page.goto(url);
  await page.waitForFunction(() => navigator.serviceWorker?.controller, null, { timeout: 15000 }).catch(async () => {
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker?.controller, null, { timeout: 15000 });
  });
  await ctx.setOffline(true);
  await page.reload();
  await page.waitForSelector('.card h2');
  await ctx.setOffline(false);

  step('no horizontal overflow, no console errors');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  assert.deepEqual(errors, []);
  console.log('\nALL E2E CHECKS PASSED');
} catch (e) {
  await shot('zz-failure');
  console.error('\nE2E FAILED:', e.message, '\nconsole errors:', errors);
  process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((r) => server.httpServer.close(r));
}
