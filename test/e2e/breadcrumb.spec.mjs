import { expect, test } from '@playwright/test';
import { breadcrumbEdges, breadcrumbShape } from './support/breadcrumb.mjs';

const LONG_CRUMB = '/07-appendix-sources/01-how-citations-work/';
const MEASURED = '/01-proven-techniques/02-stats-run-the-show/';
const SECTION_INDEX = '/01-proven-techniques/';
const TAKEOUT = '/01-proven-techniques/01-measure-first/';

/**
 * The last crumb's separator shares a line box with the title it belongs to.
 *
 * The label was a `display: block` span in a raw Tailwind `text-sm`, inside a trail
 * that is mono and scales with the reader's text size. Block pushed the title onto
 * its own line box, so the `/` sat alone above it: a 41.4px row for a 21.4px label,
 * two line boxes, two families, two leadings, and a gap between them that ran from
 * 1.45px at the default size to 5.74px at 120%.
 *
 * `breadcrumbShape`'s `separatorStranded` could not see any of that — it compared
 * the separator to the ITEM it lives in, which is true by construction, so it passed
 * on the broken row. It now measures the separator against the LABEL, which is the
 * pair that can disagree.
 */
async function lastCrumbSharesItsSeparator({ page }) {
  for (const route of [LONG_CRUMB, SECTION_INDEX, MEASURED]) {
    await page.goto(route);
    const crumb = await breadcrumbShape(page);
    const last = crumb.items.at(-1);

    expect(last, `${route} has no last crumb`).toBeDefined();
    expect(last.separatorStranded, `"${last.text}" stranded its separator`).toBe(false);
  }
}

/**
 * The trail is capped at the measure like everything else in the column, so a long
 * title stops at the same x the prose, the h1 and the h2 rule stop at.
 *
 * It was capped at the 46rem TRACK and overhung by 70px — and by ~101px and ~119px
 * at the other two measure steps, because the measure and the track move together
 * and the track moves further.
 */
async function trailSharesTheRightEdge({ page }) {
  for (const route of [LONG_CRUMB, MEASURED, TAKEOUT]) {
    await page.goto(route);
    const edges = await breadcrumbEdges(page);

    expect(edges.trail, `${route} trail right edge`).toBe(edges.article);
    expect(edges.trail, `${route} trail vs h1`).toBe(edges.h1);
  }
}

/**
 * The trail and the prose count the same characters, because `ch` resolves against
 * the element's OWN font.
 *
 * `@layer base` puts `nav { font-family: var(--font-sans) }` on every nav in the
 * project, so the breadcrumb measured 70 characters of INTER — 794.88px — while the
 * h1 and the prose, in a `font-serif` article, measured 70 characters of Source Serif
 * — 666.54px. The cap was 128px too loose, the 46rem parent won it, and
 * `max-w-measure` on the trail did nothing at all.
 *
 * Asserted on the computed value rather than on the outcome, because the outcome
 * above is indistinguishable from "the cap is not there" — which is what it was.
 */
async function trailAndProseMeasureTheSameCharacters({ page }) {
  await page.goto(LONG_CRUMB);
  const maxWidths = await page.evaluate(() => {
    const of = (selector) => getComputedStyle(document.querySelector(selector)).maxWidth;
    return { article: of('article.prose'), trail: of('nav[aria-label="Breadcrumb"]') };
  });

  expect(maxWidths.trail).toBe(maxWidths.article);
}

test.describe('the breadcrumb is aligned', () => {
  test('the last crumb shares a line with its own separator', lastCrumbSharesItsSeparator);
  test('the trail shares the reading surface one right edge', trailSharesTheRightEdge);
  test(
    'the trail and the prose measure the same characters',
    trailAndProseMeasureTheSameCharacters,
  );
});
