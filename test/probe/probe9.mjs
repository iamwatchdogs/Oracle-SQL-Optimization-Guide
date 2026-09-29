/**
 * PROBE — see ./README.md for what this found and which spec now guards it.
 * Diagnostic output only; not an assertion. Run: `bun test/probe/probe9.mjs`
 */
import { withPage, MOBILE, ROUTES } from './harness.mjs';

await withPage(MOBILE, ROUTES.howToProve, async (p) => {
  console.log(
    JSON.stringify(
      await p.evaluate(() => {
        const li = [...document.querySelectorAll('li')].find(
          (l) => l.scrollWidth > l.clientWidth + 1,
        );
        if (!li) {
          return {
            found: false,
            note: 'no list item overflows its content box on this route',
          };
        }
        const r2 = li.getBoundingClientRect();
        const rng = document.createRange();
        rng.selectNodeContents(li);
        const rects = [...rng.getClientRects()]
          .map((x) => ({
            l: +x.left.toFixed(0),
            r: +x.right.toFixed(0),
            w: +x.width.toFixed(0),
            y: +x.top.toFixed(0),
          }))
          .sort((a, b) => b.r - a.r)
          .slice(0, 4);
        const liS = getComputedStyle(li);
        return {
          liLeft: +r2.left.toFixed(1),
          liRight: +r2.right.toFixed(1),
          liW: +r2.width.toFixed(1),
          liSW: li.scrollWidth,
          liCW: li.clientWidth,
          padL: liS.paddingLeft,
          padR: liS.paddingRight,
          ovWrap: liS.overflowWrap,
          rects,
          html: (document.querySelector('article.prose').innerHTML.match(/<li[^>]*>.{0,700}/s) || [
            '',
          ])[0],
        };
      }),
      null,
      1,
    ),
  );
});
