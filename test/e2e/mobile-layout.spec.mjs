import { expect, test } from '@playwright/test';
import { findEscapingOverflow, px } from './support/disclosure.mjs';

/**
 * Mobile layout.
 *
 * A real shipped bug was structurally invisible to the suite: the only
 * horizontal-overflow detector ran at 1280x720 exclusively, while
 * `/00-preface/02-how-to-prove-a-win/` rendered 914px of content into a 390px
 * viewport. Two independent causes, both fixed:
 *
 *   1. The reading grid used a bare `1fr` track (and, below `lg`, a single
 *      implicit `auto` column). A grid track's automatic minimum size is its
 *      min-content width, so one wide markdown table pushed the whole document
 *      wide. Fix: `minmax(0,1fr)` on both tracks.
 *   2. `.prose .task-list-item { display: flex }` promoted every inline run
 *      inside a task-list item to its own flex item, so a sentence with eight
 *      `<code>` spans was laid out as one side-by-side row 868px wide. Fix: the
 *      checkbox is absolutely positioned and the sentence stays inline.
 *
 * `findEscapingOverflow` deliberately ignores content inside a legitimate
 * horizontal scroll container — a wide table is supposed to report a rect
 * wider than the viewport. Only content that widens the document fails here.
 */

const ROUTES = [
  '/',
  '/00-preface/',
  '/00-preface/01-why-evidence-grades/',
  '/00-preface/02-how-to-prove-a-win/',
  '/01-proven-techniques/01-measure-first/',
  '/02-papers-behind-recipes/02-oracles-own-papers/',
  '/03-toolbox/01-measure-with-xplan-and-monitor/',
  '/05-feedback-loop/',
  '/07-appendix-sources/01-how-citations-work/',
  '/08-bonus-batch-api/',
];

const PHONE = { width: 390, height: 844 };

/** One test per route in the linear read, named after the route. */
function declareNoOverflowTests() {
  for (const route of ROUTES) {
    test(`no escaping horizontal overflow on ${route}`, async ({ page }) => {
      await page.goto(route);
      // Font fallback changes metrics, and a reflow is a layout change rather
      // than an overflow regression. Settle webfonts first.
      await page.evaluate(() => document.fonts.ready);
      const report = await findEscapingOverflow(page);
      expect(
        report.escapes,
        `${route} let content escape: ${JSON.stringify(report.escapes, null, 1)}`,
      ).toEqual([]);
    });
  }
}

test.describe('mobile layout — nothing escapes the viewport', () => {
  test.use({ viewport: PHONE });

  declareNoOverflowTests();

  test(
    'breaks a /-joined identifier chain instead of pushing it past the column',
    breaksJoinedChain,
  );

  test('keeps a long inline code chip inside the reading column', keepsChipsInsideTheColumn);

  test('renders a task-list item as wrapped prose, not a row of chips', rendersTaskItemsAsProse);
});

async function breaksJoinedChain({ page }) {
  await page.goto('/00-preface/02-how-to-prove-a-win/');
  // A task-list item chains `sql_id`/`child_number`/`parsing_schema_name`/
  // `con_id` with no spaces. Each chip is narrower than the column, so neither
  // `overflow-wrap: anywhere` on the chip nor `break-word` on the chip will
  // break the 373px run — only `break-word` inherited by the container.
  const report = await findEscapingOverflow(page);
  expect(report.escapes.filter((escape) => escape.tag === 'li')).toEqual([]);
}

async function keepsChipsInsideTheColumn({ page }) {
  await page.goto('/00-preface/02-how-to-prove-a-win/');
  /*
   * Reuses `findEscapingOverflow` rather than re-deriving the bound. A chip
   * inside a table cell or a code block is inside a legitimate horizontal
   * scroll container, so its viewport-absolute `right` legitimately exceeds the
   * article's — comparing it against a column offset flagged 138 chips that
   * were never escaping anything. What has to be true is that no chip escapes
   * EVERY scroll container and widens the document.
   */
  const report = await findEscapingOverflow(page);
  expect(report.escapes.filter((escape) => escape.tag === 'code')).toEqual([]);
}

async function rendersTaskItemsAsProse({ page }) {
  await page.goto('/00-preface/02-how-to-prove-a-win/');
  const item = page.locator('li.task-list-item').first();
  const lines = await item.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const tops = new Set([...range.getClientRects()].map((rect) => Math.round(rect.top / 4)));
    return { lineCount: tops.size, display: getComputedStyle(el).display };
  });
  // `.prose .task-list-item` sets `position: relative` and a padding, and takes
  // the checkbox out of flow with `position: absolute` — it never sets
  // `display`, so the `<li>` keeps the UA value `list-item`. `flex` here would
  // promote every inline run to its own flex item and lay the sentence out as
  // one side-by-side row.
  expect(lines.display).toBe('list-item');
  expect(lines.lineCount).toBeGreaterThan(1);
}

test.describe('mobile layout — header and navigation', () => {
  test.use({ viewport: PHONE });

  test('keeps every header control at or above a 44px touch target', keepsHeaderControlsAt44px);

  test(
    'keeps the brand lockup and the theme toggle inside the viewport',
    keepsHeaderInsideViewport,
  );

  test('shows the mobile table of contents and hides the desktop rail', showsMobileTocNotRail);

  test('anchors the site-nav panel to the viewport with a gutter', anchorsTheSiteNavPanel);

  test(
    'caps the site-nav panel at 100dvh minus 6rem so it scrolls internally',
    capsTheSiteNavPanel,
  );
});

async function keepsHeaderControlsAt44px({ page }) {
  await page.goto('/');
  const controls = await page
    .locator('header a, header button, header summary')
    .evaluateAll((nodes) =>
      nodes
        .filter((node) => node.getBoundingClientRect().width > 0)
        .map((node) => ({
          tag: node.tagName.toLowerCase(),
          height: Math.round(node.getBoundingClientRect().height),
        })),
    );
  expect(controls.length).toBeGreaterThan(0);
  for (const control of controls) {
    expect(
      control.height,
      `${control.tag} is only ${control.height}px tall`,
    ).toBeGreaterThanOrEqual(44);
  }
}

async function keepsHeaderInsideViewport({ page }) {
  await page.goto('/');
  const boxes = await page.locator('header a, header button').evaluateAll((nodes) =>
    nodes
      .filter((node) => node.getBoundingClientRect().width > 0)
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return { right: Math.round(rect.right), left: Math.round(rect.left) };
      }),
  );
  for (const box of boxes) {
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(390);
  }
}

async function showsMobileTocNotRail({ page }) {
  await page.goto('/00-preface/');
  await expect(page.locator('[data-toc-mobile]')).toBeVisible();
  await expect(page.locator('aside.toc-viewport')).toBeHidden();
}

async function anchorsTheSiteNavPanel({ page }) {
  await page.goto('/');
  await page.locator('header details > summary').click();
  const panel = page.locator('header nav[aria-label="Book sections"]');
  await expect(panel).toBeVisible();
  const box = await panel.boundingBox();
  expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
}

async function capsTheSiteNavPanel({ page }) {
  await page.goto('/');
  await page.locator('header details > summary').click();
  const metrics = await page.locator('header nav[aria-label="Book sections"]').evaluate((el) => ({
    maxHeight: getComputedStyle(el).maxHeight,
    overflowY: getComputedStyle(el).overflowY,
    overscroll: getComputedStyle(el).overscrollBehaviorY,
  }));
  // The authored cap is `max-height: calc(100dvh - 6rem)`. `getComputedStyle`
  // resolves that to an absolute length, so the declared unit is gone by the
  // time it can be read — asserting `dvh` here could never match. What is
  // assertable is the resolved cap: the viewport height less a 6rem chrome bar.
  expect(metrics.maxHeight).toBe('748px');
  expect(px(metrics.maxHeight)).toBe(844 - 6 * 16);
  expect(metrics.overflowY).toBe('auto');
  expect(metrics.overscroll).toContain('contain');
}

/*
 * The rail breakpoint is `lg` = 64rem.
 *
 * The tests probe 1100px, not 1024px. Measured against the built site:
 *
 *   width   chromium   webkit
 *   1023    mobile     mobile
 *   1024    desktop    mobile     <-- engines disagree at the boundary
 *   1025    desktop    mobile     <-- and here too
 *   1100    desktop    desktop
 *
 * `min-width: 64rem` at exactly 64rem is evaluated differently by the engines
 * (root font size resolution and sub-pixel rounding), so a test written AT the
 * boundary is a test of the browser, not of this layout — it failed on webkit
 * while passing everywhere else. What the stylesheet actually guarantees is
 * the behaviour on each side of the breakpoint, so that is what is asserted,
 * with room to spare on both sides.
 */
const ABOVE_LG = 1100;
const BELOW_LG = 900;

test.describe('mobile layout — reading grid on either side of the lg breakpoint', () => {
  test('shows the sticky rail and hides the mobile disclosure above lg', showsTheStickyRail);

  test('switches the reading grid to two columns above lg', switchesToTwoColumns);

  test('keeps a single column and the mobile disclosure below lg', staysSingleColumnBelowLg);
});

async function showsTheStickyRail({ page }) {
  await page.setViewportSize({ width: ABOVE_LG, height: 900 });
  await page.goto('/00-preface/');
  await expect(page.locator('aside.toc-viewport')).toBeVisible();
  await expect(page.locator('[data-toc-mobile]')).toBeHidden();
}

async function switchesToTwoColumns({ page }) {
  await page.setViewportSize({ width: ABOVE_LG, height: 900 });
  await page.goto('/00-preface/');
  const columns = await page
    .locator('main#main')
    .evaluate((el) => getComputedStyle(el.parentElement).gridTemplateColumns);
  expect(columns.split(' ')).toHaveLength(2);
}

async function staysSingleColumnBelowLg({ page }) {
  await page.setViewportSize({ width: BELOW_LG, height: 900 });
  await page.goto('/00-preface/');
  const columns = await page
    .locator('main#main')
    .evaluate((el) => getComputedStyle(el.parentElement).gridTemplateColumns);
  expect(columns.split(' ')).toHaveLength(1);
  await expect(page.locator('aside.toc-viewport')).toBeHidden();
  await expect(page.locator('[data-toc-mobile]')).toBeVisible();
}
