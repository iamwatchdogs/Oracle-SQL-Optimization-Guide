/**
 * PROBE — what escapes the viewport at 390px, and why.
 *
 * Run: `bun test/probe/probe-escaping.mjs` (needs the dev server on :4321).
 *
 * Origin: after giving the mobile site-nav overlay an explicit
 * `w-[calc(100vw_-_2rem)]`, `findEscapingOverflow` started reporting escapes on
 * every route. Either the fix is wrong, or the probe is measuring a closed
 * `<details>`' overlay that has no business being laid out at all. This prints
 * the offenders with their full ancestor chain so the difference is visible.
 *
 * Promotion map: the resolved answer is asserted in
 * `test/e2e/mobile-layout.spec.mjs` and `test/e2e/site-nav.spec.mjs`.
 */
import { withPage, MOBILE, escapingOverflow } from './harness.mjs';

const ROUTES = ['/', '/00-preface/02-how-to-prove-a-win/', '/no-such-route-at-all/'];

for (const route of ROUTES) {
  const report = await withPage(MOBILE, route, async (page) => {
    const escapes = await page.evaluate(escapingOverflow);
    const chains = await page.evaluate(() => {
      const docWidth = document.documentElement.clientWidth;
      const out = [];
      for (const el of document.querySelectorAll('body *')) {
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.right <= docWidth + 1) {
          continue;
        }
        const chain = [];
        for (let node = el; node && node !== document.body; node = node.parentElement) {
          const s = getComputedStyle(node);
          chain.push({
            tag: node.tagName.toLowerCase(),
            cls: String(node.className || '').slice(0, 44),
            position: s.position,
            overflowX: s.overflowX,
            width: +node.getBoundingClientRect().width.toFixed(1),
            right: +node.getBoundingClientRect().right.toFixed(1),
            offsetParent: node.offsetParent ? node.offsetParent.tagName.toLowerCase() : null,
          });
          if (s.overflowX !== 'visible') break;
        }
        out.push(chain);
      }
      return out;
    });
    return { escapes, chains };
  });
  if (!report) {
    console.log(route, '-> page failed to load');
    continue;
  }

  console.log(`\n===== ${route} =====`);
  console.log('escapes:', report.escapes?.escapes?.length, report.escapes);
  for (const chain of report.chains.slice(0, 3)) {
    console.log('  chain:');
    for (const link of chain) {
      console.log(
        `    ${link.tag.padEnd(8)} w=${String(link.width).padStart(6)} r=${String(link.right).padStart(6)} pos=${link.position.padEnd(8)} ovx=${link.overflowX.padEnd(7)} op=${link.offsetParent}  ${link.cls}`,
      );
    }
  }
}
