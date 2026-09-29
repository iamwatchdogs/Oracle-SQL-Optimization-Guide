import { expect, test } from '@playwright/test';
import { findEscapingOverflow, px } from './support/disclosure.mjs';
import { FIRST_PAGE } from './support/pages.mjs';

/*
 * The 404 page.
 *
 * It used to diverge from every other page in five ways at once, and had no
 * assertion anywhere in the suite — partly because the e2e static server
 * returned a bare `text/plain` body for an unknown path instead of
 * `dist/404.html`. The server now serves the real 404 document, so the page is
 * reachable and testable.
 *
 * Promotion map for `test/probe/`: see `test/probe/README.md`.
 */
test.describe('404 page', () => {
  test('is served for an unknown route and returns a 404 status', isServedWithA404Status);

  test('uses the shared layout and stays focusable as the skip target', usesTheSharedLayout);

  test('is excluded from search indexing', isExcludedFromSearchIndexing);

  test('offers exactly two recovery links and both resolve', offersTwoRecoveryLinks);

  test('renders no table of contents and no pager', rendersNoTocAndNoPager);

  test('uses the title token, not the home-only display token', usesTheTitleToken);

  test('participates in the route swap like every other page', joinsTheRouteSwap);

  test('does not overflow at 390px', doesNotOverflowAt390px);
});

async function isServedWithA404Status({ page }) {
  const response = await page.goto('/definitely-not-a-real-route/');
  expect(response?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('Page not found');
}

async function usesTheSharedLayout({ page }) {
  await page.goto('/no-such-page/');
  await expect(page.locator('header')).toHaveCount(1);
  await expect(page.locator('#theme-toggle')).toHaveCount(1);
  const tabindex = await page.locator('main#main').getAttribute('tabindex');
  expect(tabindex).toBe('-1');
}

async function isExcludedFromSearchIndexing({ page }) {
  await page.goto('/no-such-page/');
  const robots = await page.locator('meta[name="robots"]').getAttribute('content');
  expect(robots).toContain('noindex');
}

async function offersTwoRecoveryLinks({ page }) {
  await page.goto('/no-such-page/');
  const links = page.locator('main#main a');
  await expect(links).toHaveCount(2);
  await expect(links.nth(0)).toHaveAttribute('href', '/');
  await expect(links.nth(1)).toHaveAttribute('href', '/07-appendix-sources/');
}

async function rendersNoTocAndNoPager({ page }) {
  await page.goto('/no-such-page/');
  await expect(page.locator('aside.toc-viewport')).toHaveCount(0);
  await expect(page.locator('nav[aria-label="Book navigation"]')).toHaveCount(0);
}

async function usesTheTitleToken({ page }) {
  await page.goto('/no-such-page/');
  const size = px(await page.locator('h1').evaluate((el) => getComputedStyle(el).fontSize));
  // --type-display starts at 2.75rem = 44px; --type-title starts at 1.75rem.
  expect(size).toBeLessThan(44);
  expect(size).toBeGreaterThan(24);
}

/**
 * `transition:name` does not emit an inline style.
 *
 * Astro scopes the name: the element carries `data-astro-transition-scope`
 * with a build-unique id, and the `view-transition-name` itself lives in a
 * generated stylesheet rule keyed by that id. Asserting on the `style`
 * attribute therefore never matches.
 *
 * This used to check the h1, because the h1 was the shared `page-title` zone. It is
 * not any more — a section jump must not pair a 96px home heading with a 40px section
 * heading, and the pager hop that does want the pairing names the title in CSS
 * instead. The zone every page now shares, the 404 included, is the reading column,
 * so that is what is asserted: a 404 that fell outside the swap would cut to it
 * rather than dissolve into it, which is the defect this test exists for.
 */
async function joinsTheRouteSwap({ page }) {
  const scopeOf = async (route) => {
    await page.goto(route);
    const scope = await page.locator('main#main').getAttribute('data-astro-transition-scope');
    expect(scope, `main on ${route} carries no data-astro-transition-scope`).toBeTruthy();
    return scope;
  };
  await scopeOf('/no-such-page/');
  await scopeOf(FIRST_PAGE);
}

async function doesNotOverflowAt390px({ page }) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/no-such-page/');
  expect((await findEscapingOverflow(page)).escapes).toEqual([]);
}
