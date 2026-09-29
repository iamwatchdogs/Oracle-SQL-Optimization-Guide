/**
 * PROBE — see ./README.md for what this found and which spec now guards it.
 * Diagnostic output only; not an assertion. Run: `bun test/probe/probe2.mjs`
 */
import { chromium } from 'playwright';
const B = 'http://localhost:4321';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.goto(`${B}/00-preface/02-how-to-prove-a-win/`, { waitUntil: 'networkidle' });
const r = await p.evaluate(() => {
  const docW = document.documentElement.clientWidth;
  const all = [...document.querySelectorAll('body *')]
    .map((el) => {
      const b = el.getBoundingClientRect();
      return { el, right: b.right, w: b.width };
    })
    .filter((x) => x.right > docW + 1 && x.w > 0);
  all.sort((a, b) => b.right - a.right);
  const widest = all[0];
  const chain = [];
  for (let e = widest?.el; e && e !== document.body; e = e.parentElement) {
    const s = getComputedStyle(e);
    chain.push({
      tag: e.tagName,
      cls: (e.className || '').toString().slice(0, 80),
      w: Math.round(e.getBoundingClientRect().width),
      scrollW: e.scrollWidth,
      display: s.display,
      overflowX: s.overflowX,
      minWidth: s.minWidth,
      whiteSpace: s.whiteSpace,
    });
  }
  return {
    docW,
    scrollW: document.documentElement.scrollWidth,
    chain,
    top5: all.slice(0, 5).map((x) => ({
      tag: x.el.tagName,
      cls: (x.el.className || '').toString().slice(0, 60),
      right: Math.round(x.right),
      w: Math.round(x.w),
    })),
  };
});
console.log(JSON.stringify(r, null, 1));
await b.close();
