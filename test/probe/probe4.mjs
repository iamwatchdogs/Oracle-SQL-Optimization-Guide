/**
 * PROBE — see ./README.md for what this found and which spec now guards it.
 * Diagnostic output only; not an assertion. Run: `bun test/probe/probe4.mjs`
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
      const docW = document.documentElement.clientWidth;
      const out = [];
      const walk = (el) => {
        const r = el.getBoundingClientRect();
        if (r.right > docW + 0.5 && r.right <= docW + 60 && r.width > 0)
          out.push({
            tag: el.tagName,
            cls: (el.className || '').toString().slice(0, 60),
            right: +r.right.toFixed(1),
            w: +r.width.toFixed(1),
            pos: getComputedStyle(el).position,
            ov: getComputedStyle(el).overflowX,
          });
        for (const c of el.children) walk(c);
      };
      walk(document.body);
      return {
        docW,
        bodyScrollW: document.body.scrollWidth,
        htmlScrollW: document.documentElement.scrollWidth,
        bodyW: document.body.getBoundingClientRect().width,
        out,
      };
    }),
    null,
    1,
  ),
);
await b.close();
