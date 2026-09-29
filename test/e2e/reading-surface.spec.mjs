/**
 * The reading surface: one right edge, one measure, one way to read it.
 *
 * Every assertion here was a measured browser defect first, and each is a
 * property of the SURFACE rather than of one page — so the representative routes
 * are checked together and the invariants are stated as measurements, not as
 * snapshots. A snapshot goes stale on every content edit; a measurement only
 * fails when the surface is actually wrong.
 *
 * The measurements themselves live in `support/reading-surface.mjs`; these tests
 * only judge them, and each group is kept small so a failure names the invariant
 * that broke rather than a page.
 */
import { expect, test } from '@playwright/test';
import { FIRST_PAGE } from './support/pages.mjs';
import { deployed } from './support/deployed.mjs';
import { MOBILE, TABLET, WIDE } from './support/viewports.mjs';
import { breadcrumbShape } from './support/breadcrumb.mjs';
import {
  escapingOverflow,
  forEachRoute,
  homeCentres,
  pageStrings,
  proseRight,
  readingEdges,
  takeawayFrame,
  tableGeometry,
  tocSummary,
  unnamedLandmarks,
  walkPager,
  wrappedAnnotations,
} from './support/reading-surface.mjs';

const INTERIOR = FIRST_PAGE;
const LONG_TITLE = '/08-bonus-batch-api/';
const TABLES = '/04-recipes/03-stats-pipeline-you-can-script/';
const TAKEOUT = '/01-proven-techniques/01-measure-first/';
const MEASURED = '/01-proven-techniques/02-stats-run-the-show/';
const LONG_CRUMB = '/07-appendix-sources/01-how-citations-work/';
const MANY_HEADINGS = '/00-preface/02-how-to-prove-a-win/';

test.describe('reading surface — the measure', () => {
  test.use({ viewport: WIDE });

  test('the pager, the return link and the prose share one right edge', async ({ page }) => {
    await page.goto(INTERIOR);

    const article = await proseRight(page);
    const edges = await readingEdges(page);

    /*
     * The 68ch measure is 89px narrower than the 46rem reading track it sits in,
     * so anything sized to the track broke the page's single right edge in two:
     * prose, h2 rules and the takeaway all ended at one x while the pager ran
     * 89px past it. `ch` is font-relative, so a `max-w-*` placed on the `<nav>`
     * itself measured against Inter rather than the article's serif and
     * reproduced the same overhang — which is why the measure is applied by a
     * wrapper.
     */
    expect(edges.pager, 'no pager on an interior page').not.toBeNull();
    expect(edges.pager.right, 'the pager overhangs the measure').toBe(article);
    expect(edges.h2Rule.right, 'the h2 rule does not match the measure').toBe(article);
    /* The cells sit in a two-column grid, so only the LAST reaches the measure's
     * right edge; the two share their outer edges. */
    expect(edges.firstCell.left, 'the first cell is off the measure').toBe(edges.pager.left);
    expect(edges.lastCell.right, 'the last cell does not reach the measure').toBe(article);
    /* Short and left-aligned, so the return link has no right edge to share. */
    expect(edges.bookHome.left, 'the return link is off the measure').toBe(edges.pager.left);
  });

  test('the single-cell pager at the end of the book has no rule stub', async ({ page }) => {
    await page.goto(LONG_TITLE);

    const pager = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Book navigation"]');
      return {
        cells: nav.querySelectorAll('a').length,
        borderTop: getComputedStyle(nav).borderTopWidth,
      };
    });

    expect(pager.cells, 'the last page should have only a previous link').toBe(1);
    /* With one cell in a two-column grid, a full-width rule above it left a
     * 373px stub with nothing under it — the only structural deviation in the
     * pager across 37 pages. */
    expect(pager.borderTop, 'a single cell must not carry the two-cell rule').toBe('0px');
  });
});

test.describe('reading surface — tables', () => {
  test.use({ viewport: WIDE });

  test('a table fills the measure instead of hugging its content', async ({ page }) => {
    await page.goto(TABLES);

    const { measure, tables } = await tableGeometry(page);
    expect(tables.length).toBeGreaterThan(0);

    for (const table of tables) {
      /* A two-column table rendered 239px wide inside a 647px measure, so its
       * header rule and every row rule stopped at the content width and left
       * 400px of void. `display: block` on the table was the cause. */
      expect(table.display, 'the table must keep its real table box').toBe('table');
      expect(table.width, 'a table must fill the prose measure').toBeCloseTo(measure, -1);
      expect(table.scroller, 'the wrapper owns the overflow').toBe('auto');
      expect(table.scrollerWidth).toBeCloseTo(measure, -1);
    }
  });
});

test.describe('reading surface — composition', () => {
  test.use({ viewport: WIDE });

  test('the takeaway hairline is visible against its own tint', async ({ page }) => {
    await page.goto(TAKEOUT);

    const takeaway = await takeawayFrame(page);
    expect(takeaway, 'the flagship page should carry a takeaway').not.toBeNull();
    expect(takeaway.top).toBe('1px');
    expect(takeaway.bottom).toBe('1px');
    /* `--rule` against the composited tint measured 1.09:1 in dark and 1.02:1 in
     * light — arithmetically present, visually absent, which left a borderless
     * full-measure slab. The strongest hairline in the vocabulary is the only one
     * that survives the tint. */
    expect(takeaway.color).not.toBe(takeaway.background);
  });

  test('the home page content regions share a centre line', async ({ page }) => {
    await page.goto('/');

    const centres = await homeCentres(page);
    /* The list is 832px and the prose 648px; left-aligning each against the shell
     * put their centre lines 160px apart and their left edges 252px apart, so the
     * rules stair-stepped down the page. */
    expect(centres.contributions, 'the contents list is off-axis').toBe(centres.viewport);
    expect(centres.prose, 'the prose is off-axis').toBe(centres.viewport);
  });

  test('the running head is not a third copy of the page title', async ({ page }) => {
    await page.goto(LONG_TITLE);

    const strings = await pageStrings(page);
    expect(strings.runningHead).toContain('Oracle SQL Optimization');
    expect(strings.runningHead, 'the running head repeats the h1 verbatim').not.toContain(
      strings.h1,
    );
    /* A running head names the book and, when there is a distinct chapter, the
     * chapter. On a section index the two are the same string, so the right-hand
     * half is suppressed rather than repeated. */
    expect(strings.crumbs.at(-1)).toContain(strings.h1);
  });
});

test.describe('reading surface — landmarks', () => {
  test.use({ viewport: WIDE });

  test('every landmark on a page is named', async ({ page }) => {
    await forEachRoute(page, ['/', INTERIOR, TABLES], async (route) => {
      /* The desktop TOC rail labelled its `<aside>` but not the `<nav>` inside
       * it, so a screen reader's landmark menu listed "navigation" three times on
       * an interior page and gave the reader no way to pick. */
      expect(await unnamedLandmarks(page), `${route} has unnamed landmarks`).toEqual([]);
    });
  });
});

test.describe('reading surface — mobile reading', () => {
  test.use({ viewport: MOBILE });

  test('the TOC disclosure label never wraps or starves', async ({ page }) => {
    await page.goto(MANY_HEADINGS);
    /* Open it so the scroll-spy writes the current section into the readout —
       the wide right-hand cell is what squeezed the label before. */
    await page.locator('[data-toc-mobile] > summary').click();
    await expect(page.locator('[data-toc-mobile]')).toHaveAttribute('open', '');

    const summary = await tocSummary(page);
    /* A flex item's automatic minimum size is its min-content width, so the
     * 240px readout pushed the label out of the row: it collapsed to 52px, broke
     * after "Section", and dropped a lone "s" onto a third line. The label is two
     * words and must never wrap; the readout is what yields. */
    expect(summary.label.lines, `"${summary.label.text}" wrapped`).toBe(1);
    expect(summary.icon.width, 'the disclosure icon must not shrink').toBeGreaterThan(13);
    expect(summary.readout.width, 'the readout should be the part that gives way').toBeGreaterThan(
      0,
    );
    expect(summary.height, 'a three-line summary band').toBeLessThan(60);
  });

  test('no crumb is wider than the column or strands its separator', async ({ page }) => {
    await page.goto(LONG_CRUMB);

    const crumb = await breadcrumbShape(page);
    /*
     * Two failure modes, and the first is the one that matters.
     *
     * `whitespace-nowrap` on every crumb stopped a break falling between a
     * separator and its label — and made "Papers Behind the Recipes - Read the
     * Claims Carefully" a 467px unbreakable run in a 346px box, which widened the
     * whole document by 122px at 390px. An item that does not fit the column is a
     * defect regardless of how it wraps.
     */
    for (const item of crumb.items) {
      expect(item.overflows, `"${item.text}" is wider than the column`).toBe(false);
    }
    /* The separator is INSIDE its label, so the pair is one atomic box and the two
     * cannot come apart. The root crumb has no separator. */
    for (const item of crumb.items) {
      if (item.separatorStranded !== null) {
        expect(item.separatorStranded, `"${item.text}" stranded its separator`).toBe(false);
      }
    }
    expect(crumb.lines, 'the trail should not run away down the page').toBeLessThan(80);
  });
});

test.describe('reading surface — mobile overflow and annotation', () => {
  test.use({ viewport: MOBILE });

  test('measured values and citations never break across a line', async ({ page }) => {
    await page.goto(MEASURED);

    const wrapping = await wrappedAnnotations(page);
    /* A measured figure is the evidence, and at 390px the browser broke
     * "E-Rows 1,000" at the hyphen into "E-" / "Rows 1,000" — the label
     * separated from the value it annotates. The longest `.measured` in the
     * corpus is seven characters, so nothing can overflow by staying whole. */
    expect(wrapping.measured, 'a measured value wrapped').toBe(0);
    expect(wrapping.citations, 'a citation token wrapped').toBe(0);
  });

  test('no element escapes every scroll container', async ({ page }) => {
    const routes = ['/', TABLES, MEASURED, LONG_CRUMB, INTERIOR, LONG_TITLE];
    await forEachRoute(page, routes, async (route) => {
      const result = await escapingOverflow(page);
      expect(result.escapes, `${route} overflows at 390px`).toEqual([]);
      expect(result.scrollWidth, `${route} widens the document`).toBeLessThanOrEqual(
        result.docWidth + 1,
      );
    });
  });
});

test.describe('reading surface — intermediate', () => {
  test.use({ viewport: TABLET });

  test('the table wrapper scrolls rather than widening the page', async ({ page }) => {
    await page.goto(TABLES);

    const wrapper = await page.evaluate(() => {
      const styles = getComputedStyle(document.querySelector('.prose-table-scroll'));
      return { overflowX: styles.overflowX, overscroll: styles.overscrollBehaviorX };
    });

    /* `overscroll-behavior-x: contain` stops a horizontal swipe chaining to the
     * document — which is what let one wide table push a 390px phone to 914px
     * before the container moved off the table and into the tree. */
    expect(wrapper.overflowX).toBe('auto');
    expect(wrapper.overscroll).toBe('contain');
  });
});

test('the pager walks the whole book and every link in it resolves', async ({ page, request }) => {
  const walk = await walkPager(request, INTERIOR);

  expect(walk.looped, `the pager looped at ${walk.looped}`).toBeNull();
  expect(walk.dead, 'dead pager targets').toEqual([]);
  expect(walk.route, 'the walk did not reach the end of the book').toBe(
    deployed('/08-bonus-batch-api/'),
  );
  expect(walk.visited.size, 'the chain does not cover the book').toBeGreaterThan(30);
  expect(walk.hasNext, 'the last page still offers a next link').toBeNull();
  expect(walk.hasPrev, 'the last page lost its previous link').toBe(true);

  /* And the terminal state is a real read, not a single-cell shell. */
  await page.goto(walk.route);
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('nav[aria-label="Book navigation"] a[rel="prev"]')).toHaveCount(1);
  await expect(page.locator('nav[aria-label="Book navigation"] a[rel="next"]')).toHaveCount(0);
});
