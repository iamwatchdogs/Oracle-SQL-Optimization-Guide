/**
 * PROBE — see ./README.md for what this found and which spec now guards it.
 * Diagnostic output only; not an assertion. Run: `bun test/probe/probe6.mjs`
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
      const info = (el) => ({
        tag: el.tagName,
        cls: (el.className || '').toString().slice(0, 50),
        sw: el.scrollWidth,
        cw: el.clientWidth,
        ow: getComputedStyle(el).overflowX,
        w: +el.getBoundingClientRect().width.toFixed(1),
      });
      const bodyKids = [...document.body.children].map(info);
      const main = document.querySelector('main#main');
      const deep = [];
      const walk = (el, d) => {
        if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX === 'visible') {
          deep.push({ ...info(el), depth: d });
        }
        for (const c of el.children) walk(c, d + 1);
      };
      walk(main, 0);
      return { docSW: document.documentElement.scrollWidth, bodyKids, deep: deep.slice(0, 10) };
    }),
    null,
    1,
  ),
);
await b.close();
