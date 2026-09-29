/**
 * PROBE — see ./README.md for what this found and which spec now guards it.
 * Diagnostic output only; not an assertion. Run: `bun test/probe/probe3.mjs`
 */
import { chromium } from 'playwright';
const B = 'http://localhost:4321';
const b = await chromium.launch();
for (const route of [
  '/00-preface/02-how-to-prove-a-win/',
  '/01-proven-techniques/01-measure-first/',
  '/',
  '/404.html',
  '/02-papers-behind-recipes/02-oracles-own-papers/',
]) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto(B + route, { waitUntil: 'networkidle' });
  const r = await p.evaluate(() => {
    const docW = document.documentElement.clientWidth;
    const inScroller = (el) => {
      for (let e = el.parentElement; e; e = e.parentElement) {
        const o = getComputedStyle(e);
        if (o.overflowX !== 'visible') return true;
      }
      return false;
    };
    const bad = [...document.querySelectorAll('body *')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.right > docW + 1 && r.width > 0 && !inScroller(el);
      })
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          cls: (el.className || '').toString().slice(0, 55),
          right: Math.round(r.right),
          w: Math.round(r.width),
          text: (el.textContent || '').trim().slice(0, 30),
        };
      });
    return {
      scrollW: document.documentElement.scrollWidth,
      docW,
      badCount: bad.length,
      bad: bad.slice(0, 6),
    };
  });
  console.log(
    route,
    '=> docScrollW',
    r.scrollW,
    'clientW',
    r.docW,
    'unescaped-overflow',
    r.badCount,
  );
  for (const e of r.bad) console.log('   ', e.tag, e.right, e.w, JSON.stringify(e.cls), e.text);
  await p.close();
}
await b.close();
