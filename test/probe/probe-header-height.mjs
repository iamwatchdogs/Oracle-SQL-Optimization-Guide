/**
 * PROBE — header height and site-nav panel geometry, closed and open.
 *
 * Run: `bun test/probe/probe-header-height.mjs` (needs the dev server on :4321).
 *
 * Origin: making the mobile menu in-flow (`max-[48rem]:open:basis-full` on the
 * `<details>`) initially used an unconditional `basis-full`, which wrapped the
 * summary onto its own flex row even while the menu was shut — a 96px sticky
 * header on a phone, permanently on screen. The open case also has to stay a
 * full-width 358px panel below the controls.
 *
 * Promotion map: asserted in `test/e2e/site-nav.spec.mjs`.
 */
import { withPage, MOBILE, DESKTOP } from './harness.mjs';

const measure = (page) =>
  page.evaluate(() => {
    const header = document.querySelector('header');
    const details = document.querySelector('header details');
    const summary = details.querySelector('summary');
    const panel = details.querySelector('div');
    const box = (el) => {
      const r = el.getBoundingClientRect();
      return {
        w: +r.width.toFixed(1),
        l: +r.left.toFixed(1),
        r: +r.right.toFixed(1),
        h: +r.height.toFixed(1),
      };
    };
    return {
      headerHeight: +header.getBoundingClientRect().height.toFixed(1),
      headerWidth: +header.getBoundingClientRect().width.toFixed(1),
      detailsPosition: getComputedStyle(details).position,
      panelPosition: getComputedStyle(panel).position,
      summary: box(summary),
      panel: box(panel),
    };
  });

for (const [label, viewport] of [
  ['mobile 390', MOBILE],
  ['desktop 1280', DESKTOP],
]) {
  const closed = await withPage(viewport, '/', (page) => measure(page));

  const open = await withPage(viewport, '/', async (page) => {
    await page.evaluate(() => {
      document.querySelector('header details').setAttribute('open', '');
    });
    await page.waitForTimeout(450);
    return measure(page);
  });

  console.log(`\n===== ${label} =====`);
  console.log('closed:', JSON.stringify(closed));
  console.log('open:  ', JSON.stringify(open));
}
