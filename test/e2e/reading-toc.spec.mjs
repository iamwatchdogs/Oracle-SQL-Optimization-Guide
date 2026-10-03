import { expect, test } from '@playwright/test';
import { accessibleNames } from './support/accessible-name.mjs';
import { scrollToRatio } from './support/disclosure.mjs';
import {
  ACTIVE_LINK,
  ARTICLE,
  DESKTOP_VIEWPORT,
  MOBILE_ACTIVE_LINK,
  PHONE_VIEWPORT,
  SECTION,
  activeLabel,
} from './support/toc.mjs';

/**
 * Reading table of contents.
 *
 * Two real defects are guarded here.
 *
 * 1. Truncation never engaged. `truncate` is
 *    `text-overflow: ellipsis; white-space: nowrap; overflow: hidden`, and the
 *    label was a flex item. A flex item's automatic minimum size is its
 *    min-content width, which under `nowrap` equals the full heading width — so
 *    the box physically could not shrink and the text simply spilled out of
 *    the 280px rail. 137 of 356 shipped links overflowed, across 32 of 36
 *    interior pages. Fix: `min-w-0` on the row, `min-w-0 flex-1` on the label.
 *
 * 2. No active section after back/forward. `astro:page-load` fires *after* the
 *    router restores the scroll offset, and the initial band gate only ever
 *    measured the first heading — whose rect is then far above the viewport. No
 *    active state was set and the TOC showed no current section until the reader
 *    scrolled. Fix: resolve the band across all entries and fall back to the
 *    last heading above it.
 *
 * The interaction and structure halves of this surface live in
 * `reading-toc-interaction.spec.mjs` and `reading-toc-structure.spec.mjs`.
 */

test.describe('reading table of contents — truncation', () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test('never lets a heading label spill out of the rail', async ({ page }) => {
    await page.goto(SECTION);
    const spills = await page.locator('aside.toc-viewport [data-toc-link]').evaluateAll((links) =>
      links
        .map((link) => {
          const label = link.querySelector('span:last-child');
          return {
            text: (label?.textContent ?? '').slice(0, 48),
            clientWidth: label?.clientWidth ?? 0,
            scrollWidth: label?.scrollWidth ?? 0,
            linkWidth: Math.round(link.getBoundingClientRect().width),
          };
        })
        .filter((row) => row.scrollWidth > row.clientWidth + 1 && row.clientWidth > 0),
    );
    // A truncated label is allowed to have scrollWidth > clientWidth — that is
    // what the ellipsis is. What it must not do is exceed its own link box.
    for (const row of spills) {
      expect(row.clientWidth, `label wider than its link: ${row.text}`).toBeLessThanOrEqual(
        row.linkWidth,
      );
    }
  });

  test('keeps the rail itself from scrolling horizontally', async ({ page }) => {
    await page.goto(SECTION);
    const rail = await page
      .locator('aside.toc-viewport')
      .evaluate((el) => ({ clientWidth: el.clientWidth, scrollWidth: el.scrollWidth }));
    expect(rail.scrollWidth).toBeLessThanOrEqual(rail.clientWidth + 1);
  });

  test('shows a full-text tooltip for a truncated heading', async ({ page }) => {
    await page.goto('/08-bonus-batch-api/');
    const link = page.locator('aside.toc-viewport [data-toc-link]').first();
    await expect(link).toHaveAttribute('title', /.+?/u);
  });

  test('leaves the mobile list untruncated so long headings wrap', async ({ page }) => {
    await page.setViewportSize(PHONE_VIEWPORT);
    await page.goto('/08-bonus-batch-api/');
    await page.locator('[data-toc-mobile] summary').click();
    const label = page.locator('[data-toc-mobile] [data-toc-link] span:last-child').first();
    const style = await label.evaluate((el) => getComputedStyle(el).whiteSpace);
    expect(style).toBe('normal');
  });
});

test.describe('reading table of contents — scroll-spy', () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test('marks a section current on a top-of-page load', marksASectionCurrentOnLoad);

  test(
    'keeps exactly one current link in each list at every scroll position',
    keepsExactlyOneCurrentLinkAtEveryScrollPosition,
  );

  test('marks the last section current at the bottom of the page', marksTheLastSectionCurrent);

  test('exposes aria-current="location" on the current link only', exposesAriaCurrentOnOne);

  test('names every link with its heading text, not its ordinal', namesEveryLinkWithItsHeading);

  test(
    'restores an active section when history returns to a scrolled position',
    restoresAnActiveSectionFromHistory,
  );

  test('leaves the list untouched for a hash that names no heading', leavesTheListUntouched);
});

async function marksASectionCurrentOnLoad({ page }) {
  await page.goto(SECTION);
  await expect.poll(() => page.locator(ACTIVE_LINK).count()).toBe(1);
}

/**
 * One scroll position, then both lists are checked.
 *
 * Deliberately a named helper called from a plain statement rather than from a
 * `for` loop: each position only means anything *after* the previous scroll has
 * settled, so the five positions are a strictly ordered sequence and must not be
 * run concurrently.
 */
async function expectOneCurrentLinkPerListAt(page, ratio) {
  await scrollToRatio(page.locator('html'), ratio);
  await page.waitForTimeout(150);
  await expect(page.locator(ACTIVE_LINK)).toHaveCount(1);
  await expect(page.locator(MOBILE_ACTIVE_LINK)).toHaveCount(1);
}

async function keepsExactlyOneCurrentLinkAtEveryScrollPosition({ page }) {
  await page.goto(ARTICLE);
  await expectOneCurrentLinkPerListAt(page, 0);
  await expectOneCurrentLinkPerListAt(page, 0.25);
  await expectOneCurrentLinkPerListAt(page, 0.5);
  await expectOneCurrentLinkPerListAt(page, 0.75);
  await expectOneCurrentLinkPerListAt(page, 1);
}

async function marksTheLastSectionCurrent({ page }) {
  await page.goto(ARTICLE);
  await scrollToRatio(page.locator('html'), 1);
  const last = await page
    .locator('aside.toc-viewport [data-toc-link]')
    .last()
    .getAttribute('data-toc-link');
  await expect
    .poll(() => activeLabel(page))
    .toBe(
      (await page.locator(`aside.toc-viewport [data-toc-link="${last}"]`).textContent())?.trim(),
    );
}

async function exposesAriaCurrentOnOne({ page }) {
  await page.goto(SECTION);
  await expect
    .poll(() => page.locator('aside.toc-viewport [data-toc-link][aria-current="location"]').count())
    .toBe(1);
}

/**
 * The ordinal is real, and it is decorative: every link ships
 * `<span aria-hidden="true">01</span><span …>Heading</span>`. So the name the
 * reader hears is the heading text, while `textContent` is `"01Heading"` — the
 * two have to be compared the way the platform compares them, or the ordinal
 * reads as part of the heading.
 */
async function namesEveryLinkWithItsHeading({ page }) {
  await page.goto(SECTION);
  const links = page.locator('aside.toc-viewport [data-toc-link]');
  const accessible = await accessibleNames(links);
  const headings = await links.evaluateAll((nodes) =>
    nodes.map((link) => {
      // Heading ids are markdown slugs and often begin with a digit, so the id
      // has to be escaped before it can be used as a selector.
      const heading = document.querySelector('#' + CSS.escape(link.dataset.tocLink));
      return (heading?.textContent ?? '').replaceAll(/\s+/gu, ' ').trim();
    }),
  );
  expect(accessible.length).toBeGreaterThan(0);
  expect(accessible.length).toBe(headings.length);
  for (const [index, name] of accessible.entries()) {
    expect(name, `link ${index} is not named after its heading`).toBe(headings[index]);
  }
}

async function restoresAnActiveSectionFromHistory({ page }) {
  await page.goto(SECTION);
  await scrollToRatio(page.locator('html'), 0.6);
  await page.waitForTimeout(200);
  const deepLabel = (await activeLabel(page))?.trim();

  await page.goto('/');
  /*
   * `scrollRestoration = 'manual'` before the history hop. Otherwise the
   * BROWSER also restores the scroll position, and on Firefox that raced the
   * ClientRouter's own restoration from `history.state` — the test sampled the
   * page at the top, which is the one state the regression is not about.
   */
  await page.evaluate(() => {
    window.history.scrollRestoration = 'manual';
  });
  await page.goBack();
  // Wait for the router to finish, INCLUDING its scroll restoration. Polling
  // only for the links to exist races the `scrollTo` and sampled the page at
  // the top, which is the state the regression is not about.
  await page.waitForFunction(
    () => document.querySelectorAll('aside.toc-viewport [data-toc-link]').length > 0,
    undefined,
    { timeout: 15_000, polling: 200 },
  );
  await expect
    .poll(() => page.evaluate(() => window.scrollY), { timeout: 10_000 })
    .toBeGreaterThan(0);
  /*
   * The regression: after a history hop back to a scrolled position, no link
   * carried `data-active="true"` until the reader scrolled again.
   */
  await expect(page.locator(ACTIVE_LINK)).toHaveCount(1);

  /*
   * Then check the spy is CORRECT on the restored page, at a position this test
   * controls.
   *
   * The earlier version compared the restored label against the label captured
   * at 0.6 before navigating away, which quietly required the ClientRouter's
   * restored offset to match 0.6 to the pixel. It does not: the restored offset
   * differs by a few pixels per engine, and a few pixels can move the 15%-35%
   * band onto a neighbouring heading. Chromium, Firefox and WebKit each failed
   * this a different way, none of which was a product defect. Re-establishing a
   * known position removes that coupling and still exercises the spy.
   */
  await expectSpyNamesSectionAt(page, 0.6, deepLabel);
}

/** Re-establish a known scroll position and check the spy names that section. */
async function expectSpyNamesSectionAt(page, ratio, expectedLabel) {
  await scrollToRatio(page.locator('html'), ratio);
  await expect(page.locator(ACTIVE_LINK)).toHaveCount(1);
  await expect
    .poll(async () => (await activeLabel(page))?.trim(), { timeout: 10_000 })
    .toBe(expectedLabel);
}

async function leavesTheListUntouched({ page }) {
  await page.goto(SECTION);
  const before = await page.locator(ACTIVE_LINK).count();
  expect(before).toBeGreaterThan(0);
  await page.evaluate(() => {
    window.location.hash = '#definitely-not-a-heading';
  });
  await page.waitForTimeout(200);
  // A bogus fragment must not blank every `data-active` in the list.
  await expect(page.locator(ACTIVE_LINK)).toHaveCount(1);
}
