/*
 * What the loader has in it, before it is ever revealed.
 *
 * The loader's state machine is `route-loader.spec.mjs` and its geometry is
 * `skeleton-mapping.spec.mjs`. This is the markup half: that the resting skeleton
 * is a page rather than a bar chart, and that none of it reaches an assistive
 * technology.
 *
 * It is a separate file because both of those assertions used to live in
 * `route-loader.spec.mjs`, where they were two of twelve tests about timing and
 * visibility, and the file grew past the 300-line ceiling the linter enforces.
 * A ceiling is not a reason to delete a test. It is a reason to name the thing.
 */

import { expect, test } from '@playwright/test';
import { LOADER, LOADER_MESSAGE as MESSAGE } from './support/route-loader.mjs';
import { DESKTOP_VIEWPORT } from './support/toc.mjs';

/*
 * Count the rows that are actually drawn.
 *
 * Every shape ships in the same markup and CSS decides which one is showing, so
 * `toHaveCount` on a row counts all three shapes' worth. `checkVisibility()`
 * rather than a computed `display`, because a shape hidden by an ANCESTOR still
 * reports `display: block` of its own.
 */
const rectOf = (page, selectors) =>
  page.evaluate((map) => {
    const out = {};
    for (const [key, selector] of Object.entries(map)) {
      const { left, top, width } = document.querySelector(selector).getBoundingClientRect();
      out[key] = { left: Math.round(left), top: Math.round(top), width: Math.round(width) };
    }
    return out;
  }, selectors);

const readRows = (page) =>
  page.evaluate(() => {
    const rect = (node) => {
      const { left, top, width } = node.getBoundingClientRect();
      return { left: Math.round(left), top: Math.round(top), width: Math.round(width) };
    };
    const rows = {};
    for (const row of document.querySelectorAll('#route-loader [data-skeleton-row]')) {
      if (row.checkVisibility()) {
        rows[row.dataset.skeletonRow] = rect(row);
      }
    }
    return rows;
  });

const gotoAndSettle = async (page, path) => {
  await page.goto(path);
  await page.waitForTimeout(400);
};

const visibleRows = (page, row) =>
  page
    .locator(`${LOADER} [data-skeleton-row="${row}"]`)
    .evaluateAll((nodes) => nodes.filter((node) => node.checkVisibility()).length);

async function rendersTheWholePageItIsStandingInFor({ page }) {
  /*
   * This used to assert exactly three bars, and every version of this loader
   * passed it — including the one that put three 12px hairlines across the full
   * shell, 372px left of the article, and the one that then made them 43px tall.
   * Counting bars says a skeleton exists. It says nothing about whether the bars
   * are anywhere near the page they are replacing, which is the only question a
   * reader has.
   *
   * So the count is now a statement about the page: the skeleton carries one shape
   * per page type, exactly one of them is visible, and the visible one is the
   * notebook until a navigation says otherwise. What that shape lands on is
   * measured, not counted, in `skeleton-mapping.spec.mjs`.
   */
  const shapes = page.locator(`${LOADER} [data-skeleton-shape]`);
  await expect(shapes).toHaveCount(3);
  await expect(page.locator(LOADER)).toHaveAttribute('data-skeleton', 'notebook');

  const visible = await shapes.evaluateAll((nodes) =>
    nodes.filter((node) => node.checkVisibility()).map((node) => node.dataset.skeletonShape),
  );
  expect(visible).toEqual(['notebook']);

  /* And it is a page, not a bar chart: the notebook shape carries a breadcrumb
     row, an article header, prose and a code frame; the home shape a display
     title and a metadata margin. Exactly one of each row is drawn, and which
     shape is drawn is the destination's decision. */
  for (const row of ['breadcrumb', 'header', 'code', 'title']) {
    expect(await visibleRows(page, row), `visible "${row}" rows`).toBe(1);
  }
  expect(await visibleRows(page, 'aside'), 'the notebook has no metadata margin').toBe(0);

  /* Point it at the hero and the columns swap over. This is the state the
     controller puts the loader in for a navigation to `/`, and it is the reason
     the two branches exist at all. */
  await page.evaluate(() => {
    document.querySelector('#route-loader').dataset.skeleton = 'home';
  });
  expect(await visibleRows(page, 'aside'), 'the hero has a metadata margin').toBe(1);
  expect(await visibleRows(page, 'breadcrumb'), 'the hero has no breadcrumb').toBe(0);
}

async function hidesSkeletonFromAT({ page }) {
  /*
   * The decorative skeleton is one `aria-hidden` island and the status message is
   * not inside it — a screen reader hears "Loading requested page" and nothing
   * else, not forty grey rectangles.
   *
   * This counts the skeleton's own wrapper rather than every `[aria-hidden]` in
   * the subtree. The rows inside carry their own `aria-hidden` for the same
   * reason, and the breadcrumb is `aria-hidden` because it stands in for a nav
   * whose real links do not exist yet.
   */
  await expect(page.locator(`${LOADER} > .route-skeleton`)).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator(MESSAGE)).toHaveClass(/sr-only/u);
  /* The message is a sibling of the decorative island, not a descendant. */
  expect(await page.locator(`${LOADER} .route-skeleton ${MESSAGE}`).count()).toBe(0);
}

/*
 * The code frame is drawn at the measure, not the track.
 *
 * The reading track is 46rem and the measure is 70ch, so anything sized to the
 * track is 70px wider than the text it is standing in for — and a code block is
 * the widest thing on the page, which makes it the easiest place for that to show.
 */
async function drawsTheCodeFrameAtTheMeasure({ page }) {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await gotoAndSettle(page, '/');

  const to = '/01-proven-techniques/01-measure-first/';
  await page.route(`**${to}`, async (route) => {
    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
    await route.continue();
  });
  await page.evaluate((href) => {
    [...document.querySelectorAll('a')].find((a) => a.getAttribute('href') === href).click();
  }, to);

  await expect(page.locator('#route-loader')).toHaveAttribute('data-visible', 'true');
  const skeleton = { rows: await readRows(page) };

  await page.waitForURL(`**${to}`);
  await page.waitForTimeout(500);
  const real = await rectOf(page, { article: 'article.prose', code: '.expressive-code' });

  /* The reading track is 46rem and the measure is 70ch; anything sized to the
     track is 70px wider than the text it is standing in for. */
  expect(skeleton.rows.code.width).toBeCloseTo(real.article.width, 0);
  expect(skeleton.rows.code.left).toBeCloseTo(real.article.left, 0);
  expect(real.code.width).toBeCloseTo(real.article.width, 0);
}

/*
 * The loader's mapping is measured in `skeleton-mapping.spec.mjs`, against all
 * three page types, at two viewports, and with the rail shut. It used to be
 * checked here instead, by counting the loader's bars and comparing the first one
 * to the `h1` — which passed for a skeleton whose bars were 372px from the article
 * and for one that was 120px out once the rail was shut, because the count was
 * three in both cases and the one bar it compared was the one it had placed
 * correctly by hand.
 *
 * What is left here is the part that is about the SWAP rather than the shape: the
 * loader is one element across the navigation, not a skeleton that unmounts and
 * remounts underneath the reader, and it is holding the shape of the page it is
 * now standing in front of.
 */
async function keepsTheLoaderInStepWithTheSwap({ page }) {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto('/00-preface/02-how-to-prove-a-win/');
  await page.waitForTimeout(600);

  expect(await page.locator('#route-loader').count()).toBe(1);

  await page.evaluate(() => {
    [...document.querySelectorAll('a')]
      .find((anchor) => anchor.getAttribute('href')?.startsWith('/01-proven-techniques/'))
      .click();
  });
  await page.waitForTimeout(800);

  const after = await page.evaluate(() => {
    const loader = document.querySelector('#route-loader');
    return {
      count: document.querySelectorAll('#route-loader').length,
      shape: loader?.dataset.skeleton,
      visible: loader?.dataset.visible,
    };
  });
  expect(after.count).toBe(1);
  expect(after.shape).toBe('section');
  expect(after.visible).toBe('false');
}

test.describe('the route loader — resting skeleton', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders the whole page it is standing in for', rendersTheWholePageItIsStandingInFor);
  test('marks the skeleton decorative and hides it from assistive tech', hidesSkeletonFromAT);
  test('draws the code frame at the measure, not the track', drawsTheCodeFrameAtTheMeasure);
  test(
    'keeps the loader in step with the swap it is standing in for',
    keepsTheLoaderInStepWithTheSwap,
  );
});
