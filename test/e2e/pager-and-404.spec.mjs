import { expect, test } from '@playwright/test';
import { accessibleNames } from './support/accessible-name.mjs';
import { FIRST_PAGE } from './support/pages.mjs';

/**
 * Prev/next pager, breadcrumb and the shared page shell.
 *
 * The 404 page lives in `not-found.spec.mjs`.
 *
 * None of these surfaces had a single assertion anywhere in the suite. The 404
 * page was additionally unreachable through the e2e static server, which
 * returned a bare `text/plain` body for an unknown path instead of
 * `dist/404.html`; the server now serves the real 404 document.
 */

const FIRST_SECTION = '/00-preface/';
const LAST_PAGE = '/08-bonus-batch-api/';
const ARTICLE_MIDDLE = '/01-proven-techniques/01-measure-first/';

test.describe('prev/next pager', () => {
  test('links a first-section page back to the book home', linksBackToTheBookHome);

  test('omits the next link on the final page of the book', omitsNextOnTheFinalPage);

  test(
    'renders one prev and one next on a middle page with matching titles',
    rendersBothOnAMiddlePage,
  );

  test('exposes exactly one Book navigation landmark', exposesOneNavigationLandmark);

  test('keeps the pager labels free of arrow glyphs', keepsPagerLabelsArrowFree);

  test('omits the pager from the home page', omitsThePagerFromTheHomePage);
});

async function linksBackToTheBookHome({ page }) {
  await page.goto(FIRST_PAGE);
  const prev = page.locator('nav[aria-label="Book navigation"] a[rel="prev"]');
  await expect(prev).toHaveCount(1);
  await expect(prev).toHaveAttribute('href', FIRST_SECTION);
}

async function omitsNextOnTheFinalPage({ page }) {
  await page.goto(LAST_PAGE);
  await expect(page.locator('nav[aria-label="Book navigation"] a[rel="next"]')).toHaveCount(0);
  await expect(page.locator('nav[aria-label="Book navigation"] a[rel="prev"]')).toHaveCount(1);
}

async function rendersBothOnAMiddlePage({ page }) {
  await page.goto(ARTICLE_MIDDLE);
  const pager = page.locator('nav[aria-label="Book navigation"]');
  await expect(pager.locator('a[rel="prev"]')).toHaveCount(1);
  await expect(pager.locator('a[rel="next"]')).toHaveCount(1);
  const next = pager.locator('a[rel="next"]');
  const nextHref = await next.getAttribute('href');
  // The arrow is `<span aria-hidden="true">→</span>` sitting *inside* the
  // `.running-head` label, so it is itself a `span:last-child` — a bare
  // `span:last-child` matched both it and the title span and tripped strict
  // mode. The child combinator restricts the match to the link's own direct
  // children, of which the title is the last.
  const nextTitle = (await next.locator('> span').last().textContent())?.trim();
  expect(nextHref).toBeTruthy();
  expect(nextTitle).toBeTruthy();
  await next.click();
  await page.waitForFunction((target) => location.pathname === target, nextHref, {
    timeout: 15_000,
  });
  await expect(page.locator('h1')).toHaveText(nextTitle);
}

async function exposesOneNavigationLandmark({ page }) {
  await page.goto(ARTICLE_MIDDLE);
  await expect(page.locator('nav[aria-label="Book navigation"]')).toHaveCount(1);
}

async function keepsPagerLabelsArrowFree({ page }) {
  await page.goto(ARTICLE_MIDDLE);
  // The labels are `<span aria-hidden="true">←</span> Previous`, so the raw
  // `textContent` is `"← Previous"`. The arrow is decorative and hidden from the
  // accessibility tree, so what has to be arrow-free is the *accessible name* —
  // which is what the link announces and what `getByRole` matches on.
  const labels = page.locator('nav[aria-label="Book navigation"] .running-head');
  await expect(labels).toHaveCount(2);
  const names = await accessibleNames(labels);
  expect(names).toEqual(['Previous', 'Next']);
  /*
   * The same claim at the LINK level, which is where a name is actually used.
   *
   * Two earlier attempts here were wrong and are worth recording:
   *
   * - `getByRole('link', { name: /^previous$/ })` can never match. The anchor's
   *   name is `"Previous <chapter title>"` because the title is a second span
   *   inside the same link; a name is not taken from an `aria-hidden` node, but
   *   neither is it truncated at one.
   * - `labels.filter({ hasText: /^Previous$/ })` can never match either.
   *   `hasText` compares `textContent`, and the arrow is in the DOM — it is only
   *   hidden from the accessibility TREE. So the label's `textContent` is
   *   `"← Previous"`, arrow and all.
   *
   * So: the arrow must be absent from the name, present in the text, and the
   * link's name must open with the label. That is the whole claim.
   */
  const linkText = await page
    .locator('nav[aria-label="Book navigation"] a')
    .evaluateAll((nodes) => nodes.map((el) => el.textContent ?? ''));
  for (const text of linkText) {
    expect(text, 'the arrow belongs in the DOM, just not in the name').toMatch(/[←→]/u);
  }

  const pagerNames = await accessibleNames(page.locator('nav[aria-label="Book navigation"] a'));
  expect(pagerNames).toHaveLength(2);
  for (const name of pagerNames) {
    expect(name).not.toMatch(/[←→]/u);
  }
  expect(pagerNames[0]).toMatch(/^Previous\b/u);
  expect(pagerNames[1]).toMatch(/^Next\b/u);
}

async function omitsThePagerFromTheHomePage({ page }) {
  await page.goto('/');
  await expect(page.locator('nav[aria-label="Book navigation"]')).toHaveCount(0);
}

test.describe('breadcrumb', () => {
  test(
    'renders Home plus the section title on a section index page',
    rendersTwoCrumbsOnASectionIndex,
  );

  test('renders Home / section / page on a child page', rendersThreeCrumbsOnAChildPage);

  test('renders the last crumb as a non-link span', rendersTheLastCrumbAsASpan);

  test('renders no breadcrumb on the home page', rendersNoBreadcrumbOnTheHomePage);

  test('hides the separator slashes from assistive tech', hidesSeparatorSlashesFromAT);
});

async function rendersTwoCrumbsOnASectionIndex({ page }) {
  await page.goto(FIRST_SECTION);
  const crumbs = page.locator('nav[aria-label="Breadcrumb"] li');
  await expect(crumbs).toHaveCount(2);
}

async function rendersThreeCrumbsOnAChildPage({ page }) {
  await page.goto(FIRST_PAGE);
  await expect(page.locator('nav[aria-label="Breadcrumb"] li')).toHaveCount(3);
}

async function rendersTheLastCrumbAsASpan({ page }) {
  await page.goto(FIRST_PAGE);
  await expect(page.locator('nav[aria-label="Breadcrumb"] a')).toHaveCount(2);
  await expect(
    page.locator('nav[aria-label="Breadcrumb"] li').last().locator('span').first(),
  ).toBeVisible();
}

async function rendersNoBreadcrumbOnTheHomePage({ page }) {
  await page.goto('/');
  await expect(page.locator('nav[aria-label="Breadcrumb"]')).toHaveCount(0);
}

async function hidesSeparatorSlashesFromAT({ page }) {
  await page.goto(FIRST_PAGE);
  /*
   * A descendant selector, not `li >`. The separator is now the LABEL's own first
   * child rather than its sibling: a label is an `inline-block`, which is atomic, so
   * a sibling separator was left alone on the line above a title too long for the
   * space left on its line. That matters for the intermediate crumbs, which are
   * links — an `aria-hidden` `/` INSIDE a link is still decoration and still excluded
   * from the link's accessible name, which is what the assertions below check, and
   * which a `li >` selector would have stopped being able to check at all.
   */
  const hidden = await page
    .locator('nav[aria-label="Breadcrumb"] li span[aria-hidden="true"]')
    .evaluateAll((nodes) => nodes.map((node) => node.textContent?.trim()));
  expect(hidden.length).toBeGreaterThan(0);
  for (const glyph of hidden) {
    expect(glyph).toBe('/');
  }

  /*
   * Every crumb link carries one of those hidden separators, which is what keeps the
   * `/` out of its accessible name. Asserted structurally rather than on
   * `textContent`, which cannot answer the question: it includes `aria-hidden` text,
   * so it would read `/ Appendix Sources` whether or not the glyph is hidden.
   */
  const links = await page.locator('nav[aria-label="Breadcrumb"] li a').count();
  expect(links).toBeGreaterThan(0);
  expect(hidden.length).toBe(links);
}

test.describe('page shell', () => {
  test('pushes the footer to the bottom of a short page', pushesTheFooterDown);

  test('aligns the running head, header, and footer on one left edge', alignsTheThreeLeftEdges);

  test('makes the Contents button name stable across viewport widths', keepsTheContentsNameStable);

  test('ships a canonical without a query string or fragment', shipsACleanCanonical);

  test('gives every page a social description even without frontmatter copy', describesEveryPage);
});

async function pushesTheFooterDown({ page }) {
  await page.setViewportSize({ width: 1280, height: 1400 });
  await page.goto('/00-preface/');
  const gap = await page.evaluate(() => {
    const footer = document.querySelector('footer');
    return Math.round(window.innerHeight - footer.getBoundingClientRect().bottom);
  });
  // `mt-auto` is inert unless `body` is a flex column, so the footer used to
  // float mid-viewport with a dead zone beneath it.
  expect(gap).toBeLessThanOrEqual(2);
}

async function alignsTheThreeLeftEdges({ page }) {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto(FIRST_PAGE);
  const lefts = await page.evaluate(() => {
    /** The left edge of the first match for `selector`, rounded to whole pixels. */
    function leftEdgeOf(selector) {
      const el = document.querySelector(selector);
      return el ? Math.round(el.getBoundingClientRect().left) : null;
    }
    return {
      header: leftEdgeOf('header .mx-auto'),
      runningHead: leftEdgeOf('.running-head'),
      footer: leftEdgeOf('footer .mx-auto'),
    };
  });
  // The running head used a `w-shell-wide` container while the header and
  // footer used `w-shell`, misaligning all three by 64px per side at 1400px.
  expect(lefts.runningHead).toBe(lefts.header);
  expect(lefts.footer).toBe(lefts.header);
}

async function keepsTheContentsNameStable({ page }) {
  const nameAt = async (width) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(FIRST_PAGE);
    return page
      .locator('header #site-nav > summary')
      .evaluate((el) => (el.textContent ?? '').replaceAll(/\s+/gu, ' ').trim());
  };
  // The section counter was inside the accessible name, so the same control
  // was "Contents 01 / 09" at 481px and "Contents" at 480px.
  expect(await nameAt(1280)).toBe(await nameAt(390));
}

async function shipsACleanCanonical({ page }) {
  await page.goto(`${FIRST_PAGE}?utm_source=test#somewhere`);
  const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
  expect(canonical).not.toContain('utm_source');
  expect(canonical).not.toContain('#');
}

/**
 * Load a route, then read its two description tags.
 *
 * Each route replaces the document on the one `page`, so the three probes are
 * sequential calls rather than a loop.
 */
async function socialDescriptionsOf(page, route) {
  await page.goto(route);
  const og = await page.locator('meta[property="og:description"]').getAttribute('content');
  const name = await page.locator('meta[name="description"]').getAttribute('content');
  return { route, og, name };
}

async function describesEveryPage({ page }) {
  const [home, article, notFound] = [
    await socialDescriptionsOf(page, '/'),
    await socialDescriptionsOf(page, FIRST_PAGE),
    await socialDescriptionsOf(page, '/no-such-page/'),
  ];
  for (const { route, og, name } of [home, article, notFound]) {
    expect(og, `og:description missing on ${route}`).toBeTruthy();
    expect(og).toBe(name);
  }
}
