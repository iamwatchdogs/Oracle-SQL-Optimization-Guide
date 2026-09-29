/**
 * PROBE — see ./README.md for what this found and which spec now guards it.
 * Diagnostic output only; not an assertion. Run: `bun test/probe/probe7.mjs`
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
      const out = [];
      const walk = (el) => {
        if (
          el.scrollWidth > el.clientWidth + 1 &&
          getComputedStyle(el).overflowX === 'visible' &&
          ![...el.children].some((c) => c.scrollWidth > el.clientWidth + 1)
        ) {
          const s = getComputedStyle(el);
          out.push({
            tag: el.tagName,
            cls: (el.className || '').toString().slice(0, 60),
            sw: el.scrollWidth,
            cw: el.clientWidth,
            ws: s.whiteSpace,
            owWrap: s.overflowWrap,
            wordBreak: s.wordBreak,
            fs: s.fontSize,
            ff: s.fontFamily.split(',')[0],
            text: (el.textContent || '').trim().slice(0, 60),
          });
        }
        for (const c of el.children) walk(c);
      };
      walk(document.querySelector('main#main'));
      return out.slice(0, 12);
    }),
    null,
    1,
  ),
);
await b.close();
