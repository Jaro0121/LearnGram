// Renders the brand artwork (public/icon.svg) into every PNG the web app and Android app need.
// Run after changing the icon:  node e2e/icons.mjs
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');

const svg = readFileSync(new URL('../public/icon.svg', import.meta.url), 'utf8');
const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const out = (p) => new URL(`../${p}`, import.meta.url).pathname;
const BG = 'linear-gradient(135deg,#8b7bff,#ff5c8a)';

/** The book glyph only, scaled to `scale` of the canvas (for maskable / adaptive icons). */
const glyph = (scale, withBg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  ${withBg ? '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b7bff"/><stop offset="1" stop-color="#ff5c8a"/></linearGradient></defs><rect width="512" height="512" fill="url(#g)"/>' : ''}
  <g transform="translate(256 256) scale(${scale}) translate(-256 -243)">${inner.replace(/<defs>[\s\S]*?<\/defs>/, '').replace(/<rect[^>]*\/>/, '')}</g></svg>`;

const jobs = [
  ...[180, 192, 512].map((s) => ({ file: `public/icon-${s}.png`, w: s, h: s, html: svg })),
  { file: 'public/icon-maskable-512.png', w: 512, h: 512, html: glyph(0.72, true) },
  // Sources for `npx @capacitor/assets generate --android`
  { file: 'assets/icon-only.png', w: 1024, h: 1024, html: svg },
  { file: 'assets/icon-foreground.png', w: 1024, h: 1024, html: glyph(0.62, false), transparent: true },
  { file: 'assets/icon-background.png', w: 1024, h: 1024, html: `<div style="width:1024px;height:1024px;background:${BG}"></div>` },
  { file: 'assets/splash.png', w: 2732, h: 2732, html: `<div style="width:2732px;height:2732px;background:#0b0b12;display:grid;place-items:center"><div style="width:520px;height:520px;border-radius:120px;overflow:hidden">${svg}</div></div>` },
  { file: 'assets/splash-dark.png', w: 2732, h: 2732, html: `<div style="width:2732px;height:2732px;background:#0b0b12;display:grid;place-items:center"><div style="width:520px;height:520px;border-radius:120px;overflow:hidden">${svg}</div></div>` },
  // Social preview card
  { file: 'public/og.png', w: 1200, h: 630, html: `<div style="width:1200px;height:630px;background:radial-gradient(120% 90% at 20% 0%,#2a1f5c,#0b0b12 70%);display:flex;align-items:center;gap:56px;padding:0 90px;box-sizing:border-box;font-family:system-ui,sans-serif;color:#fff">
      <div style="width:260px;height:260px;border-radius:60px;overflow:hidden;flex:none">${svg}</div>
      <div><div style="font-size:92px;font-weight:800;letter-spacing:-3px">LearnGram</div>
      <div style="font-size:40px;color:#c9c6e8;margin-top:10px;line-height:1.25">Swipe through facts.<br>Actually remember them.</div></div></div>` },
];

const browser = await chromium.launch();
for (const j of jobs) {
  const page = await browser.newPage({ viewport: { width: j.w, height: j.h } });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:100%;height:100%}body>svg{width:${j.w}px;height:${j.h}px}</style>${j.html}`);
  await page.screenshot({ path: out(j.file), omitBackground: !!j.transparent });
  await page.close();
}
await browser.close();
console.log(`wrote ${jobs.length} images`);
