import { expect, test } from '@playwright/test';
import { findEscapingOverflow, px } from './support/disclosure.mjs';
import { tableMetrics } from './support/tables.mjs';

/**
 * Rendered markdown tables.
 *
 * Every content page in the book ships 2–7 tables, and they are the densest
 * surface in the design: SQL identifiers, plan operations and measured numbers
 * in a 68ch column. These specs exist because the authored table CSS was
 * silently dead.
 *
 * Root cause guarded here: `@tailwindcss/typography` emits its whole `.prose`
 * block into the `utilities` cascade layer, which outranks `@layer components`
 * regardless of specificity. With the authored rules in `components`, the
 * plugin won every conflict and the page shipped:
 *   - `padding: 0` on the first and last cell of every row (columns glued to
 *     the column edge),
 *   - a 7.875px/9px asymmetric header cell,
 *   - `vertical-align: baseline` overriding the intended `top`,
 *   - `font-size: 0.875em` from the plugin instead of `--type-ui`,
 *   - inline `<code>` at `font-weight: 600` instead of the design system's 400.
 *
 * `test/integration/prose-cascade.test.mjs` guards the layer contract on the
 * compiled stylesheet; this file guards the rendered result.
 */

const TABLE_ROUTE = '/01-proven-techniques/01-measure-first/';
const PAPER_ROUTES = [
  '/',
  '/00-preface/02-how-to-prove-a-win/',
  '/01-proven-techniques/01-measure-first/',
  '/02-papers-behind-recipes/02-oracles-own-papers/',
  '/08-bonus-batch-api/',
  '/no-such-route-at-all/',
];

test.describe('rendered tables — cascade contract', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TABLE_ROUTE);
  });

  test('is its own horizontal scroll container', async ({ page }) => {
    const metrics = await tableMetrics(page.locator('.prose table').first());
    expect(metrics.display).toBe('block');
    expect(metrics.overflowX).toBe('auto');
  });

  test('contains horizontal overscroll so a swipe cannot chain to the document', async ({
    page,
  }) => {
    const metrics = await tableMetrics(page.locator('.prose table').first());
    expect(metrics.overscrollBehaviorX).toBe('contain');
  });

  test('uses the design-system UI size and face, not the plugin default', async ({ page }) => {
    const metrics = await tableMetrics(page.locator('.prose table').first());
    // --type-ui is 0.875rem = 14px. The plugin's `:where(table)` sets 0.875em,
    // which computed against the 18px body to 15.75px.
    expect(metrics.fontSize).toBe('14px');
    expect(metrics.fontFamily).toMatch(/Inter/u);
    expect(metrics.fontFamily).not.toMatch(/Source Serif/u);
  });
});

test.describe('rendered tables — cell padding', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TABLE_ROUTE);
  });

  test('never zeroes the inline padding of the first or last cell in a row', async ({ page }) => {
    const metrics = await tableMetrics(page.locator('.prose table').first());
    // The regression: `:where(thead th:first-child) { padding-inline-start: 0 }`
    // and the `td` equivalent shipped, gluing column one to the column edge.
    expect(px(metrics.firstHead.paddingLeft)).toBeGreaterThan(0);
    expect(px(metrics.lastHead.paddingRight)).toBeGreaterThan(0);
    expect(px(metrics.firstCell.paddingLeft)).toBeGreaterThan(0);
    expect(px(metrics.lastCell.paddingRight)).toBeGreaterThan(0);
  });

  test('gives every cell the same inline padding', async ({ page }) => {
    const metrics = await tableMetrics(page.locator('.prose table').first());
    expect(metrics.firstCell.paddingLeft).toBe(metrics.lastCell.paddingLeft);
    expect(metrics.head.paddingLeft).toBe(metrics.cell.paddingLeft);
  });

  test('gives every cell the same block padding', async ({ page }) => {
    const metrics = await tableMetrics(page.locator('.prose table').first());
    const rem = px(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize));
    // The header is deliberately asymmetric: `.prose thead th` is authored
    // `padding: 0 0.9rem 0.6rem` alongside `vertical-align: bottom`, so
    // `padding-bottom` is the only block padding that positions anything and
    // `padding-top` contributes nothing to where the text lands. A body cell is
    // symmetric at `0.7rem`.
    //
    // What the regression actually produced was a *three-way* split — authored
    // 0.5em on the header top, the plugin's 0.5714em on its bottom, and a third
    // value again on the body cell. Pinning both cells to their two authored
    // rem values is what catches that; comparing the header against the body
    // cell cannot, because the design never asked them to match.
    expect(px(metrics.head.paddingTop)).toBe(0);
    expect(px(metrics.head.paddingBottom)).toBeCloseTo(0.6 * rem, 1);
    expect(metrics.cell.paddingTop).toBe(metrics.cell.paddingBottom);
    expect(px(metrics.cell.paddingTop)).toBeCloseTo(0.7 * rem, 1);
  });
});

test.describe('rendered tables — rules and alignment', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TABLE_ROUTE);
  });

  test('separates rows with a single 1px hairline, never a 2px rule', async ({ page }) => {
    const metrics = await tableMetrics(page.locator('.prose table').first());
    // DESIGN.md: separation comes from 1px hairlines. The old header rule was
    // 2px solid and floated in the middle of a table with no top or bottom edge.
    expect(metrics.head.borderBottom).toBe('1px');
    expect(metrics.cell.borderBottom).toBe('1px');
  });

  test('caps every cell border at 1px', async ({ page }) => {
    const borders = await page
      .locator('.prose table th, .prose table td')
      .evaluateAll((cells) => cells.map((cell) => getComputedStyle(cell).borderBottomWidth));
    expect(borders.length).toBeGreaterThan(0);
    for (const width of borders) {
      expect(px(width)).toBeLessThanOrEqual(1);
    }
  });

  test('drops the bottom rule on the last row', async ({ page }) => {
    const lastRow = page.locator('.prose table tbody tr').last();
    const borders = await lastRow
      .locator('td')
      .evaluateAll((cells) => cells.map((cell) => getComputedStyle(cell).borderBottomWidth));
    for (const width of borders) {
      expect(px(width)).toBe(0);
    }
  });

  test('lets the header row wrap instead of forcing a nowrap minimum width', async ({ page }) => {
    const metrics = await tableMetrics(page.locator('.prose table').first());
    // `th { white-space: nowrap }` made every column's min-content equal its
    // full header line, which is what forced 170–210px of horizontal scroll on
    // a 343px phone column.
    expect(metrics.head.whiteSpace).not.toBe('nowrap');
  });
});

test.describe('rendered tables — inline code inside cells', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TABLE_ROUTE);
  });

  test('renders inline code at the design-system weight of 400', async ({ page }) => {
    const code = page.locator('.prose :not(pre) > code').first();
    await expect(code).toBeVisible();
    // The regression: the plugin's `:where(code) { font-weight: 600 }` won the
    // utilities layer, so every SQL chip in every table rendered bold.
    await expect.poll(() => code.evaluate((el) => getComputedStyle(el).fontWeight)).toBe('400');
  });

  test('renders inline code in the mono face at the annotation size', async ({ page }) => {
    const code = page.locator('.prose :not(pre) > code').first();
    const style = await code.evaluate((el) => {
      const s = getComputedStyle(el);
      return { family: s.fontFamily, size: s.fontSize };
    });
    expect(style.family).toMatch(/JetBrains Mono/u);
    // --type-annotation is 0.875em of the 18px body = 15.75px.
    expect(px(style.size)).toBeCloseTo(15.75, 1);
  });

  test('does not hyphenate identifiers inside table cells', async ({ page }) => {
    const hyphens = await page
      .locator('.prose table td, .prose table th')
      .evaluateAll((cells) => [...new Set(cells.map((cell) => getComputedStyle(cell).hyphens))]);
    expect(hyphens).toEqual(['none']);
  });
});

test.describe('rendered tables — cell alignment', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TABLE_ROUTE);
  });

  test('aligns body cells to the top of their row rather than the baseline', async ({ page }) => {
    const metrics = await tableMetrics(page.locator('.prose table').first());
    // `:where(tbody td) { vertical-align: baseline }` from the plugin won the
    // utilities layer until the authored rules were unlayered. Baseline aligns
    // each cell's FIRST BASELINE, so a row mixing a one-word code chip with a
    // three-line SQL snippet comes out visibly ragged.
    expect(metrics.cell.verticalAlign).toBe('top');
  });

  test('rests the header row on the rule it underlines', async ({ page }) => {
    const metrics = await tableMetrics(page.locator('.prose table').first());
    expect(metrics.head.verticalAlign).toBe('bottom');
  });
});

test.describe('rendered tables — do not widen the document', () => {
  for (const route of PAPER_ROUTES) {
    test(`escapes no horizontal overflow at 390px on ${route}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(route);
      // Font fallback changes metrics, and a reflow is a layout change rather
      // than an overflow regression. Settle webfonts first.
      await page.evaluate(() => document.fonts.ready);
      const report = await findEscapingOverflow(page);
      expect(
        report.escapes,
        `escaping overflow on ${route}: ${JSON.stringify(report.escapes)}`,
      ).toEqual([]);
    });
  }

  test('keeps a wide table inside its own scroll box at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/00-preface/02-how-to-prove-a-win/');
    const tables = await page.locator('.prose table').evaluateAll((nodes) =>
      nodes.map((table) => ({
        boxWidth: Math.round(table.getBoundingClientRect().width),
        clientWidth: table.clientWidth,
        scrollWidth: table.scrollWidth,
        overflowX: getComputedStyle(table).overflowX,
      })),
    );
    expect(tables.length).toBeGreaterThan(0);
    for (const table of tables) {
      expect(table.overflowX).toBe('auto');
      // The box never exceeds its column, even when the content does.
      expect(table.boxWidth).toBeLessThanOrEqual(table.clientWidth + 1);
    }
  });

  test('reports at least one table that genuinely scrolls, so the case is covered', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/00-preface/02-how-to-prove-a-win/');
    const scrollable = await page
      .locator('.prose table')
      .evaluateAll(
        (nodes) => nodes.filter((table) => table.scrollWidth > table.clientWidth + 1).length,
      );
    // If this ever hits 0 the "no overflow" assertions above have stopped
    // testing the thing they were written for.
    expect(scrollable).toBeGreaterThan(0);
  });
});

test.describe('rendered tables — structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TABLE_ROUTE);
  });

  test('exposes a header cell for every column', async ({ page }) => {
    const parity = await page.locator('.prose table').evaluateAll((tables) =>
      tables.map((table) => {
        const head = table.querySelectorAll('thead th').length;
        const firstRow = table.querySelectorAll('tbody tr')[0];
        const body = firstRow ? firstRow.querySelectorAll('td, th').length : 0;
        return { head, body };
      }),
    );
    expect(parity.length).toBeGreaterThan(0);
    for (const row of parity) {
      expect(row.head).toBe(row.body);
    }
  });

  test('renders tabular figures so measured numbers align', async ({ page }) => {
    const variant = await page
      .locator('.prose table')
      .first()
      .evaluate((table) => getComputedStyle(table).fontVariantNumeric);
    expect(variant).toContain('tabular-nums');
  });

  test('carries no caption element and implies none', async ({ page }) => {
    await expect(page.locator('.prose table caption')).toHaveCount(0);
  });
});
