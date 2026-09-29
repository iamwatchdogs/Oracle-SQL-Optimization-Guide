/**
 * PROBE — see ./README.md for what this found and which spec now guards it.
 * Diagnostic output only; not an assertion. Run: `bun test/probe/probe8.mjs`
 */
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.goto('http://localhost:4321/00-preface/02-how-to-prove-a-win/', {
  waitUntil: 'networkidle',
});
console.log(
  await p.evaluate(() => {
    const li = [...document.querySelectorAll('li')].find((l) => l.scrollWidth > l.clientWidth + 1);
    if (!li) {
      return { found: false, note: 'no list item overflows its content box — fixed' };
    }
    return [...li.childNodes].map((n) => {
      if (n.nodeType === 3) return { text: 'TEXT: ' + n.textContent.slice(0, 50) };
      const s = getComputedStyle(n);
      const r = n.getBoundingClientRect();
      return {
        tag: n.tagName,
        cls: (n.className || '').toString().slice(0, 40),
        w: +r.width.toFixed(1),
        right: +r.right.toFixed(1),
        ws: s.whiteSpace,
        ow: s.overflowWrap,
        display: s.display,
      };
    });
  }),
);
await b.close();
