import { expect, test } from '@playwright/test';
import { ARTICLE, DESKTOP_VIEWPORT, SECTION } from './support/toc.mjs';

/**
 * Reading table of contents — structure.
 *
 * The truncation and scroll-spy halves of this surface live in
 * `reading-toc.spec.mjs` and the interaction halves in
 * `reading-toc-interaction.spec.mjs`; the shared routes and viewports are in
 * `support/toc.mjs`.
 */

test.describe('reading table of contents — structure', () => {
  /*
   * The desktop rail is `hidden` below `lg`, so on the `mobile-chromium` project
   * (Pixel 7) every label measured here is inside a `display: none` subtree and
   * all of its rects are zero. The indent assertions then compare `0 > 0`.
   *
   * The viewport belongs on the `describe`, not inside each test: a test that
   * sets it only works if it runs first, which is an accident of ordering, not a
   * guarantee. `reading-toc.spec.mjs` pins it the same way.
   */
  test.use({ viewport: DESKTOP_VIEWPORT });

  test('includes h4 procedural steps that were previously unreachable', includesH4Steps);

  test('indents deeper levels progressively', indentsDeeperLevelsProgressively);

  test('renders no table of contents on the home page', rendersNoTocOnTheHomePage);

  test('labels the desktop and mobile lists distinctly', labelsTheTwoListsDistinctly);

  test(
    'does not put the mobile current-section text in a live region',
    keepsCurrentSectionOutOfLiveRegion,
  );
});

async function includesH4Steps({ page }) {
  await page.goto(ARTICLE);
  const depths = await page.locator('aside.toc-viewport [data-toc-link]').evaluateAll((links) =>
    links.map((link) => {
      // Markdown slugs may begin with a digit, so the id has to be escaped
      // before it can be used as a selector.
      const heading = document.querySelector('#' + CSS.escape(link.dataset.tocLink));
      return heading ? heading.tagName.toLowerCase() : null;
    }),
  );
  // The flagship page carries 18 `####` steps. They rendered at body size and
  // had no TOC entry, so the margin apparatus could not reach them.
  expect(depths.filter((tag) => tag === 'h4').length).toBeGreaterThan(0);
}

/**
 * The indent lives in the link's `padding-left`, not in the link's own left
 * edge: every `<a data-toc-link>` is a full-width block row, so its
 * `getBoundingClientRect().left` is the rail's left for h2, h3 *and* h4 alike
 * and measures nothing. What the reader sees is the label, offset by the row's
 * padding, so the label is what has to be measured.
 *
 * On the flagship page that is h2 at 113px, h3 at 125px, h4 at 145px, from
 * `padding-left` of 12px / 24px / 44px.
 */
async function indentsDeeperLevelsProgressively({ page }) {
  await page.goto(ARTICLE);
  const indents = await page.locator('aside.toc-viewport [data-toc-link]').evaluateAll((links) =>
    links.map((link) => ({
      tag:
        document.querySelector('#' + CSS.escape(link.dataset.tocLink))?.tagName.toLowerCase() ?? '',
      // The ordinal span is `aria-hidden`; the last span is the label.
      left: Math.round(
        (link.querySelector('span:last-child') ?? link).getBoundingClientRect().left,
      ),
    })),
  );
  const byTag = (tag) => indents.filter((row) => row.tag === tag).map((row) => row.left);
  const h2 = byTag('h2');
  const h3 = byTag('h3');
  const h4 = byTag('h4');
  expect(h2.length).toBeGreaterThan(0);
  if (h3.length > 0) {
    expect(Math.min(...h3)).toBeGreaterThan(Math.max(...h2));
  }
  if (h4.length > 0) {
    expect(Math.min(...h4)).toBeGreaterThan(h3.length > 0 ? Math.max(...h3) : Math.max(...h2));
  }
}

async function rendersNoTocOnTheHomePage({ page }) {
  await page.goto('/');
  await expect(page.locator('aside.toc-viewport')).toHaveCount(0);
  await expect(page.locator('[data-toc-mobile]')).toHaveCount(0);
}

async function labelsTheTwoListsDistinctly({ page }) {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto(SECTION);
  await expect(page.locator('aside.toc-viewport')).toHaveAttribute('aria-label', 'Sections');
  await expect(page.locator('[data-toc-mobile] nav')).toHaveAttribute(
    'aria-label',
    'Sections list',
  );
}

async function keepsCurrentSectionOutOfLiveRegion({ page }) {
  await page.goto(SECTION);
  const live = await page
    .locator('[data-toc-mobile-current]')
    .evaluate((el) => el.closest('[aria-live]') !== null);
  expect(live).toBe(false);
}
