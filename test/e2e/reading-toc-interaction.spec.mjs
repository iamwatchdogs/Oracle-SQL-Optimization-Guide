import { expect, test } from '@playwright/test';
import { ARTICLE, DESKTOP_VIEWPORT, PHONE_VIEWPORT } from './support/toc.mjs';

/**
 * Reading table of contents — interaction.
 *
 * The truncation and scroll-spy halves of this surface live in
 * `reading-toc.spec.mjs` and the structural halves in
 * `reading-toc-structure.spec.mjs`; the shared routes and viewports are in
 * `support/toc.mjs`.
 */

test.describe('reading table of contents — interaction', () => {
  test('jumps to a heading and leaves the viewport clear of the sticky header', jumpClearsHeader);

  test(
    'collapses the mobile list after a jump and still lands on the heading',
    collapsesMobileList,
  );

  test('keeps every link at or above the 44px hit target', keepsEveryLinkAt44px);
});

async function jumpClearsHeader({ page }) {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto(ARTICLE);
  const link = page.locator('aside.toc-viewport [data-toc-link]').nth(2);
  const id = await link.getAttribute('data-toc-link');
  await link.click();
  await page.waitForFunction(
    (target) => {
      // Markdown slugs may begin with a digit, so the id has to be escaped
      // before it can be used as a selector.
      const heading = document.querySelector('#' + CSS.escape(target));
      return heading ? heading.getBoundingClientRect().top < window.innerHeight * 0.5 : false;
    },
    id,
    { timeout: 10_000, polling: 200 },
  );
  const headerHeight = await page
    .locator('header')
    .first()
    .evaluate((el) => el.getBoundingClientRect().height);
  // `CSS.escape` is a browser global, not a Node one, so the slug cannot be
  // escaped into a Node-side `#id` selector — the previous
  // ``page.locator(`#${CSS.escape(id)}`)`` threw `ReferenceError: CSS is not
  // defined` in the test process. The measurement therefore happens in the page,
  // where `CSS` exists, exactly as the `waitForFunction` above already does.
  const top = await page.evaluate((target) => {
    const heading = document.querySelector('#' + CSS.escape(target));
    return heading ? heading.getBoundingClientRect().top : null;
  }, id);
  expect(top, `heading #${id} not found after the jump`).not.toBeNull();
  // `h1..h6 { scroll-margin-top: 5rem }` against a 48px sticky header.
  expect(top).toBeGreaterThanOrEqual(headerHeight - 1);
}

async function collapsesMobileList({ page }) {
  await page.setViewportSize(PHONE_VIEWPORT);
  await page.goto(ARTICLE);
  const details = page.locator('[data-toc-mobile]');
  await details.locator('summary').click();
  await expect(details).toHaveAttribute('open', '');

  const link = details.locator('[data-toc-link]').nth(2);
  const id = await link.getAttribute('data-toc-link');
  await link.click();
  await expect(details).not.toHaveAttribute('open', /.*/u);

  // The panel sits above the article, so its 280ms collapse used to shift the
  // target 100px away from where the reader was sent.
  await page.waitForFunction(
    (target) => {
      const heading = document.querySelector('#' + CSS.escape(target));
      if (!heading) {
        return false;
      }
      const { top } = heading.getBoundingClientRect();
      return top > 0 && top < window.innerHeight * 0.6;
    },
    id,
    { timeout: 10_000, polling: 200 },
  );
}

async function keepsEveryLinkAt44px({ page }) {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto(ARTICLE);
  const heights = await page
    .locator('aside.toc-viewport [data-toc-link]')
    .evaluateAll((links) => links.map((link) => Math.round(link.getBoundingClientRect().height)));
  expect(heights.length).toBeGreaterThan(0);
  for (const height of heights) {
    expect(height).toBeGreaterThanOrEqual(44);
  }
}
