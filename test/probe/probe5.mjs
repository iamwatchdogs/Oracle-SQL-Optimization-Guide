/**
 * PROBE — see ./README.md for what this found and which spec now guards it.
 * Diagnostic output only; not an assertion. Run: `bun test/probe/probe5.mjs`
 */
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.goto('http://localhost:4321/00-preface/02-how-to-prove-a-win/', {
  waitUntil: 'networkidle',
});
console.log(
  JSON.stringify(
    await p.evaluate(() => {
      return [...document.querySelectorAll('.prose table')].map((t) => {
        const s = getComputedStyle(t),
          r = t.getBoundingClientRect();
        return {
          display: s.display,
          width: s.width,
          maxWidth: s.maxWidth,
          minWidth: s.minWidth,
          overflowX: s.overflowX,
          boxW: +r.width.toFixed(1),
          left: +r.left.toFixed(1),
          scrollW: t.scrollWidth,
          clientW: t.clientWidth,
          overscroll: s.overscrollBehaviorX,
        };
      });
    }),
    null,
    1,
  ),
);
await b.close();
