/*
 * The home page's evidence key, and what it does to the page around it.
 *
 * The regression this file exists for: the title block's metadata margin was the
 * `auto` track of a `1fr auto` grid, so it was sized by its own max-content width.
 * The evidence key's panel is 150.14px wider at its widest than the summary that
 * closes it, so opening the disclosure handed those 150px to the `1fr` column,
 * re-wrapped the display title onto an extra line, and moved everything below the
 * title block. Measured, before the fix: the title lost 150.14px of width and
 * 80.62px of height, the margin's own top slid 219px up out from under the
 * pointer, the page below moved 123.25px, and the horizontal flip landed in a
 * single 2ms frame — then 283ms AFTER the close animation had visibly finished,
 * because the `content-visibility … allow-discrete` transition keeps the panel in
 * layout for a second 280ms.
 */

import { expect, test } from '@playwright/test';
import { DESKTOP_VIEWPORT, PHONE_VIEWPORT } from './support/toc.mjs';
import { READING_PREFS } from './support/disclosure.mjs';

const KEY = '#evidence-key';
const KEY_SUMMARY = `${KEY} > summary`;

const geometry = (page) =>
  page.evaluate((selector) => {
    const section = document.querySelector('section.border-y');
    const read = (element) => {
      const { top, left, width } = element.getBoundingClientRect();
      return {
        top: Math.round(top * 100) / 100,
        left: Math.round(left * 100) / 100,
        width: Math.round(width * 100) / 100,
      };
    };

    return {
      tracks: getComputedStyle(section.querySelector('.grid')).gridTemplateColumns,
      margin: read(section.querySelector('aside')),
      title: read(document.querySelector('#book-title')),
      contentsTop: read(document.querySelector('#contributions-heading')).top,
      open: document.querySelector(selector).open,
    };
  }, KEY);

/** Cumulative layout shift across one open and one close. */
const measureShift = (page) =>
  page.evaluate(
    (selector) =>
      new Promise((resolve) => {
        let total = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              total += entry.value;
            }
          }
        });
        observer.observe({ type: 'layout-shift', buffered: true });

        const summary = document.querySelector(selector).querySelector('summary');
        summary.click();
        setTimeout(() => {
          summary.click();
          setTimeout(() => {
            observer.disconnect();
            resolve(Math.round(total * 10_000) / 10_000);
          }, 900);
        }, 700);
      }),
    KEY,
  );

const panelEdges = (page) =>
  page.evaluate((selector) => {
    const key = document.querySelector(selector);
    const label = key.querySelector('summary').firstElementChild.getBoundingClientRect().left;
    const panel = key
      .querySelector('.disclosure-content-inner')
      .firstElementChild.getBoundingClientRect().left;
    return { label: Math.round(label * 100) / 100, panel: Math.round(panel * 100) / 100 };
  }, KEY);

const loadHome = async (page) => {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto('/');
  await page.waitForTimeout(700);
};

const openTheKey = async (page) => {
  await page.click(KEY_SUMMARY);
  await expect.poll(async () => (await geometry(page)).open).toBe(true);
  await page.waitForTimeout(400);
};

async function movesNothingHorizontally({ page }) {
  await loadHome(page);
  const closed = await geometry(page);
  await openTheKey(page);
  const open = await geometry(page);

  /* The whole defect, in four numbers. A content-sized track cannot hold any of
     them steady, because the panel is wider than the summary that closes it. */
  expect(open.tracks).toBe(closed.tracks);
  expect(open.title.width).toBe(closed.title.width);
  expect(open.title.top).toBe(closed.title.top);
  expect(open.margin.left).toBe(closed.margin.left);
}

async function barelyMovesThePageBelowIt({ page }) {
  await loadHome(page);
  const closed = await geometry(page);
  await openTheKey(page);
  const open = await geometry(page);

  /*
   * The metadata margin is TOP-anchored — the accordion drops downward from the top
   * right, which is what it is for — so the panel extends past the title column's
   * own height and the remainder reaches the page below. It is not zero and cannot
   * be: the panel is 343px and the title column is ~400px, and the margin hangs
   * from the top of the row.
   *
   * 79.1px at 1280, and that is a price that was paid on purpose. The panel's rows
   * were on a 24.7px pitch with the description hard against its chip, and reading
   * them as a list rather than a table is what they are for; the row gap is now
   * 0.6rem and the panel is 343px instead of 297px. The 45px of panel bought the
   * air, and the panel cannot be given the air for free.
   *
   * What is not negotiable is that the TITLE column does not move: it is 648px
   * wide before and after, pinned by `movesNothingHorizontally`, and the shift
   * itself stays inside the CLS budget at every viewport — see
   * `accumulatesBoundedLayoutShift`, which now measures the phone as well, where
   * the panel is single-column and the push is 314.8px.
   */
  const push = open.contentsTop - closed.contentsTop;
  expect(push).toBeGreaterThan(0);
  expect(push).toBeLessThan(90);
}

async function accumulatesBoundedLayoutShift({ page }) {
  await loadHome(page);

  /*
   * 0.216 before the fix, for a single open and close. This is a BOUND, not the
   * mechanism guard: the measured value drifts by 0.05 between a dev server and a
   * built bundle and under parallel workers. The mechanism is pinned by
   * `movesNothingHorizontally`, which fails the moment a content-sized track
   * comes back; this one only has to catch a gross regression.
   */
  expect(await measureShift(page)).toBeLessThan(0.15);
}

/*
 * The same bound, on a phone, where the panel is single-column.
 *
 * This is the viewport that pays most for the panel's height: the aside is below
 * the title rather than beside it, so the panel's 343px lands almost one-for-one
 * on the content below — a 314.8px push against 79.1px on a desktop. It still
 * scores 0.0799 against the same 0.15 budget, because a shift only counts against
 * the viewport and the contributions list below is far taller than the screen.
 *
 * Measuring only the desktop is how a 315px jump on the device most people read
 * on would have passed a test named for layout shift.
 */
async function accumulatesBoundedLayoutShiftOnAPhone({ page }) {
  await page.setViewportSize(PHONE_VIEWPORT);
  await loadHome(page);
  expect(await measureShift(page)).toBeLessThan(0.15);
}

async function alignsItsPanelWithTheLabelItExplains({ page }) {
  await loadHome(page);
  await openTheKey(page);

  /* Both are inset `0.9rem` inside the frame now. Before, the panel was flush
     with the border and the label 14.4px to its right — a list that looked like
     it had drifted out of its own border. */
  const edges = await panelEdges(page);
  expect(edges.label).toBe(edges.panel);
}

async function opensSingleColumnOnAPhone({ page }) {
  await page.setViewportSize(PHONE_VIEWPORT);
  await page.goto('/');
  await openTheKey(page);

  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(PHONE_VIEWPORT.width);
}

async function reachesTheSameContentFromADeepLink({ page }) {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto('/00-preface/');
  await page.click('a[href="/#evidence-key"]');
  await page.waitForURL('**/#evidence-key');
  await expect.poll(async () => (await geometry(page)).open, { timeout: 5000 }).toBe(true);
}

/**
 * The hero is composed at a fixed size; the reader's text size stops at its edge.
 *
 * Both halves matter, and the second is easy to break by accident. A rule that
 * froze the hero by un-scaling the tokens — or that froze the tokens without
 * re-declaring them at the hero's own scope — would pass an assertion that only
 * checks the title, and leave the abstract and the metadata margin scaling. And a
 * rule that froze the whole page would pass both halves of the first check and
 * take the reading environment with it.
 */
const heroIgnoresTheTextScale = async ({ page }) => {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto('/');
  await page.waitForTimeout(300);

  const read = () =>
    page.evaluate(() => ({
      abstract: getComputedStyle(document.querySelector('#book-title').nextElementSibling).fontSize,
      /* A `div.prose` here, not the `article.prose` of a reading page: the home
         page has no article element, and a selector that only exists on the other
         kind of page is a selector that silently measures nothing. */
      body: getComputedStyle(document.querySelector('.prose')).fontSize,
      contribution: getComputedStyle(
        document
          .querySelector('#contributions-heading')
          .closest('section')
          .querySelector('.font-serif'),
      ).fontSize,
      title: getComputedStyle(document.querySelector('#book-title')).fontSize,
    }));

  const before = await read();

  await page.click(`${READING_PREFS} > summary`);
  await page.click('[data-reading-pref="text"][data-value="1.2"]');
  await page.waitForTimeout(300);
  const after = await read();

  /* The composition holds: identical to the pixel at every text size. */
  expect(after.title).toBe(before.title);
  expect(after.abstract).toBe(before.abstract);

  /* The reading environment still works, and it starts immediately below the
     hero — the contributions list is a separate `<section>`, and a reader scanning
     it should get their text size. */
  expect(Number.parseFloat(after.body)).toBeGreaterThan(Number.parseFloat(before.body));
  expect(Number.parseFloat(after.contribution)).toBeGreaterThan(
    Number.parseFloat(before.contribution),
  );
};

test.describe('the evidence key', () => {
  test('moves nothing horizontally and re-wraps nothing in the title', movesNothingHorizontally);
  test('barely moves the page below it, and never sideways', barelyMovesThePageBelowIt);
  test('accumulates a bounded amount of layout shift', accumulatesBoundedLayoutShift);

  test(
    'accumulates a bounded amount of layout shift on a phone',
    accumulatesBoundedLayoutShiftOnAPhone,
  );
  test('aligns its panel with the label it explains', alignsItsPanelWithTheLabelItExplains);
  test("ignores the reader's text size", heroIgnoresTheTextScale);
  test('opens single-column on a phone without a horizontal escape', opensSingleColumnOnAPhone);
  test('opens on a #evidence-key deep link from another page', reachesTheSameContentFromADeepLink);
});
