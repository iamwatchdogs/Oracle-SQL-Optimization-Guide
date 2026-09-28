/*
 * The skeleton has to land on the page it is standing in for.
 *
 * This is the only test that could have caught either version of the loader that
 * shipped before it, and neither was caught by a test — they were caught by a
 * reader. The first was three 12px bars across the full shell, 372px left of the
 * article; the second was the same three bars made 30–43px tall. Both were
 * `position: fixed` at a hand-measured `top`, and both were checked by asserting
 * that the bars existed, that they were decorative, and that they took up no
 * layout space. Every one of those assertions passed while the skeleton lined up
 * with nothing on the page.
 *
 * So this measures the thing itself. The destination fetch is delayed so the
 * loader is on screen, its rows are read, the navigation is allowed to finish,
 * and then the same rectangles are read off the real page — and the two are
 * compared. A skeleton that is a plausible-looking arrangement of grey boxes
 * fails here; one that is built out of the page's own containers passes.
 *
 * The destination has to be delayed rather than raced because the loader only
 * appears after `LOADER_DELAY`, and on a local build a cached navigation finishes
 * inside that window.
 *
 * Horizontal geometry is asserted to 1px at every viewport: those are grid tracks,
 * not measured offsets, so anything else means the skeleton and the page are
 * computing their geometry differently — the bug this feature exists to prevent,
 * which let a skeleton sit 372px left of the article and 120px right of it once
 * the rail was shut. Vertical position is asserted to 4px on a desktop, all the way
 * down to the article header.
 *
 * On a phone the vertical assertion stops at the breadcrumb, and that is a limit
 * rather than a concession. The real breadcrumb is as tall as its own titles wrap:
 * 41.4px for a section index, 69.4px for a notebook on two rows, 137.8px for one
 * that needs three. A skeleton cannot know the destination's section title, so it
 * cannot know how many crumb rows the page has — and every row below the
 * breadcrumb moves with that number. Asserting it would mean asserting a constant,
 * and the constant would be wrong on the next page.
 */

import { expect, test } from '@playwright/test';
import { DESKTOP_VIEWPORT, PHONE_VIEWPORT } from './support/toc.mjs';

const readRects = (page, root) =>
  page.evaluate(
    ({ rootSelector }) => {
      const rect = (node) => {
        const { left, top, width, height } = node.getBoundingClientRect();
        return {
          left: Math.round(left * 10) / 10,
          top: Math.round(top * 10) / 10,
          width: Math.round(width * 10) / 10,
          height: Math.round(height * 10) / 10,
        };
      };
      /*
       * `checkVisibility()`, not a computed `display`: the home shape's branch is
       * hidden by an ANCESTOR, and a shape whose own computed display is still
       * `block` while its parent is `display: none` would look visible to a
       * display check and invisible to a reader.
       */
      const visible = [
        ...document.querySelectorAll(`${rootSelector} [data-skeleton-shape]`),
      ].filter((node) => node.checkVisibility());
      const rows = {};
      for (const node of visible) {
        for (const row of node.querySelectorAll('[data-skeleton-row]')) {
          rows[row.dataset.skeletonRow] = rect(row);
        }
      }
      return {
        shape: document.querySelector('#route-loader')?.dataset.skeleton ?? null,
        visibleShapes: visible.map((node) => node.dataset.skeletonShape),
        rows,
      };
    },
    { rootSelector: root },
  );

const readReal = (page, selectors) =>
  page.evaluate((map) => {
    const rect = (node) => {
      const { left, top, width, height } = node.getBoundingClientRect();
      return {
        left: Math.round(left * 10) / 10,
        top: Math.round(top * 10) / 10,
        width: Math.round(width * 10) / 10,
        height: Math.round(height * 10) / 10,
      };
    };
    const out = {};
    for (const [key, selector] of Object.entries(map)) {
      out[key] = rect(document.querySelector(selector));
    }
    out.scrollY = window.scrollY;
    return out;
  }, selectors);

/* Row-to-element, per page type. The tolerance is 4px: the frame's `padding-top`
   is 3rem where the sticky header is 3rem plus its own 1px rule, and everything
   else in the chain is the page's own classes computing the same numbers. */
const SAME = 4;
const EXACT = 1;

/*
 * Top, left and width — never height.
 *
 * A skeleton's rows are the right height for the type they are standing in for,
 * which is what `1lh` in the real type context buys, but a block whose height
 * comes from TEXT cannot be predicted before the text arrives: the real article
 * header is 285px on one notebook and 331px on another, from the same
 * components, because the description wraps differently. Asserting height would
 * either fail constantly or force a constant, and a constant here is a number
 * that is wrong on the next page.
 *
 * Left and width are held to 1px rather than 4: those are grid tracks, not
 * measured offsets, so anything other than exact means the two are computing
 * their geometry differently — which is the bug this whole feature was about.
 */
function expectMapsOnto(skeleton, real, pairs, { exactLeft = EXACT } = {}) {
  for (const [row, selector, tolerance = SAME] of pairs) {
    const from = skeleton.rows[row];
    const to = real[selector];
    expect(from, `skeleton row "${row}" is missing`).toBeTruthy();
    expect(to, `real element for "${row}" is missing`).toBeTruthy();
    expect(Math.abs(from.top - to.top), `${row} top`).toBeLessThanOrEqual(tolerance);
    expect(Math.abs(from.left - to.left), `${row} left`).toBeLessThanOrEqual(exactLeft);
    expect(Math.abs(from.width - to.width), `${row} width`).toBeLessThanOrEqual(tolerance);
  }
}

/*
 * Park the reader at the top of the page first: the loader is `position: fixed`
 * and the router scrolls the new document to the top, so the two only line up if
 * the reader was already there. That is the ordinary case for a reader following
 * a link, and it is the case worth asserting.
 */
/*
 * Hold the destination's response open, so the loader is on screen long enough to
 * read its rows. 500ms is comfortably past the 180ms reveal gate, and the handler
 * is registered before the click so the very first request for the page is the
 * delayed one.
 */
async function holdTheDestinationOpen(page, to) {
  await page.route(`**${to}`, async (route) => {
    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
    await route.continue();
  });
}

async function gotoAndSettle(page, path) {
  await page.goto(path);
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(100);
}

const cases = [
  {
    name: 'home',
    from: '/01-proven-techniques/',
    to: '/',
    shape: 'home',
    real: {
      title: '#book-title',
      heroGrid: 'main ~ div, [data-skeleton-real-hero]',
    },
    pairs: [['title', 'title']],
    mobilePairs: [['title', 'title']],
  },
  {
    name: 'section',
    from: '/',
    to: '/01-proven-techniques/',
    shape: 'section',
    real: {
      breadcrumb: 'nav[aria-label="Breadcrumb"]',
      title: 'article.prose h1',
      header: 'article.prose header',
    },
    pairs: [
      ['header', 'header'],
      ['title', 'title'],
    ],
    /*
     * Breadcrumb only, for the same reason as the notebook below.
     *
     * This case used to assert the header on a phone too, and it passed — but only
     * because the real last crumb was a `block` `text-sm` span, so every page
     * stacked its separator and its title onto two line boxes and the row was a
     * deterministic 41.4px whatever the titles said. That determinism WAS the
     * defect: a `/` alone on the line above its own title, in a serif face, on a
     * raw unscaled size, in a trail whose other eight elements are mono and scaled.
     *
     * Putting the title back on the separator's line removed the fixed height, so
     * the row is now as tall as the destination's own titles wrap — which is
     * unknowable from a skeleton, and is the limit the note at the top of this file
     * has always described. Asserting `header` on a phone now asserts a content
     * height, and would fail on a longer section title rather than on a real
     * mismatch.
     */
    mobilePairs: [['breadcrumb', 'breadcrumb']],
  },
  {
    name: 'notebook',
    from: '/',
    to: '/01-proven-techniques/01-measure-first/',
    shape: 'notebook',
    real: {
      breadcrumb: 'nav[aria-label="Breadcrumb"]',
      title: 'article.prose h1',
      header: 'article.prose header',
    },
    pairs: [
      ['breadcrumb', 'breadcrumb'],
      ['header', 'header'],
      ['title', 'title'],
    ],
    /*
     * The breadcrumb anchors the reading surface and its columns are asserted, but
     * the header's vertical position is not: on a phone the real breadcrumb above
     * it is one, two or three rows of the destination's own titles, and the
     * skeleton cannot know which. See the note at the top of this file.
     */
    mobilePairs: [['breadcrumb', 'breadcrumb']],
  },
];

for (const testCase of cases) {
  for (const [viewportName, viewport] of [
    ['desktop', DESKTOP_VIEWPORT],
    ['mobile', PHONE_VIEWPORT],
  ]) {
    test(`the ${testCase.name} skeleton lands on the ${testCase.name} page — ${viewportName}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await gotoAndSettle(page, testCase.from);

      /* Hold the destination open so the loader is on screen long enough to read. */
      await holdTheDestinationOpen(page, testCase.to);

      await page.evaluate((href) => {
        const link = [...document.querySelectorAll('a')].find(
          (anchor) => anchor.getAttribute('href') === href,
        );
        link.click();
      }, testCase.to);

      await expect(page.locator('#route-loader')).toHaveAttribute('data-visible', 'true');
      const skeleton = await readRects(page, '#route-loader');
      expect(skeleton.shape).toBe(testCase.shape);
      expect(skeleton.visibleShapes).toEqual([testCase.shape]);

      await page.waitForURL(`**${testCase.to}`);
      await page.waitForTimeout(500);

      const real = await readReal(page, testCase.real);
      expect(real.scrollY).toBe(0);
      const pairs = viewportName === 'mobile' ? testCase.mobilePairs : testCase.pairs;
      expectMapsOnto(skeleton, real, pairs);

      /* The columns are asserted at BOTH sizes, even where the vertical position
         is not: a skeleton that is 28px high is a nuisance, one that is 120px wide
         is the bug that started all this. */
      if (viewportName === 'mobile') {
        for (const [row, selector] of testCase.pairs) {
          const from = skeleton.rows[row];
          const to = real[selector];
          expect(Math.abs(from.left - to.left), `${row} left on a phone`).toBeLessThanOrEqual(
            EXACT,
          );
          expect(Math.abs(from.width - to.width), `${row} width on a phone`).toBeLessThanOrEqual(
            SAME,
          );
        }
      }
    });
  }
}
