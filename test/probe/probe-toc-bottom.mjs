/**
 * PROBE — what the reading scroll-spy reports at the bottom of a long article.
 *
 * Run: `bun test/probe/probe-toc-bottom.mjs` (needs the dev server on :4321).
 *
 * Origin: `test/e2e/reading-toc.spec.mjs` asserts the LAST section is current
 * when the page is scrolled to its end. That assertion failed with the FIRST
 * section reported, which is what the pre-fix behaviour looked like, so this
 * probe prints the raw geometry to tell the two cases apart: is the spy
 * resolving the wrong section, or is the page not actually at its end?
 */
import { withPage, DESKTOP, ROUTES } from './harness.mjs';
import { scrollToRatio } from '../e2e/support/disclosure.mjs';
import { activeLabel } from '../e2e/support/toc.mjs';

await withPage(DESKTOP, ROUTES.howToProve, async (page) => {
  // Use the SAME helper the spec uses, so this probe fails for the same reason.
  const landed = await scrollToRatio(page.locator('html'), 1);
  const report = await page.evaluate(() => ({
    scrollY: Math.round(window.scrollY),
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
    activeCount: [...document.querySelectorAll('aside.toc-viewport [data-toc-link]')].filter(
      (l) => l.dataset.active === 'true',
    ).length,
    lastLinkId: [...document.querySelectorAll('aside.toc-viewport [data-toc-link]')].at(-1)?.dataset
      .tocLink,
    firstActiveId: [...document.querySelectorAll('aside.toc-viewport [data-toc-link]')].find(
      (l) => l.dataset.active === 'true',
    )?.dataset.tocLink,
  }));
  report.scrollToRatioReturned = landed;
  report.mobileCurrent = (await activeLabel(page))?.trim();
  console.log(JSON.stringify(report, null, 1));
});
