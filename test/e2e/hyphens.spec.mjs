import { expect, test } from '@playwright/test';

/**
 * The rendered outcome of turning the hyphenator off: what `getComputedStyle`
 * says about the prose container, its paragraphs, and its table cells.
 *
 * `test/integration/hyphens.test.mjs` guards the DECLARATIONS — that no compiled
 * rule asks for `hyphens: auto`, and that the eight survivors are all `none` on
 * named selectors. It cannot guard the computed value, and the reason is specific
 * rather than general: `collectRules` in `css-cascade.mjs` recurses into `@media`
 * and keeps no condition, so the authored `.prose, .prose p { hyphens: none }`
 * rule is indistinguishable from an unconditional one. Because authored prose
 * rules are unlayered they outrank the `utilities` layer, so the cascade resolver
 * reports `none` for `article.prose` EVEN WITH `hyphens-auto` STILL ON IT — while
 * a 1280px browser reports `auto`, because the media query does not match there.
 * Only the layout engine knows the viewport, so only the layout engine is asked.
 *
 * The article's value is VIEWPORT-DEPENDENT by design, which is why this spec
 * asserts "not `auto`" rather than a fixed string. Desktop Chrome, Firefox and
 * Safari run at 1280x720, where the `max-width: 39.999rem` block does not match
 * and the element falls back to the initial value `manual`; `mobile-chromium`
 * runs at 412px, where the block does match and it computes `none`. `manual` and
 * `none` are the same thing to this corpus — all 37 content files contain no soft
 * hyphen — and the point of the change is only that neither one runs the
 * dictionary pass.
 *
 * The table cells are a different contract and DO have one fixed value: the three
 * authored rules are unlayered and unconditional, so `none` holds on all four
 * browser projects. That is the same number `tables.spec.mjs` asserts, from the
 * same route, with the same locator — so the two specs cannot disagree about it.
 */

/* Must stay the same route `tables.spec.mjs` uses, or the cell value below is not
 * the value that spec asserts. */
const TABLE_ROUTE = '/01-proven-techniques/01-measure-first/';

test.describe('rendered prose — hyphenation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TABLE_ROUTE);
  });

  test('neither the prose container nor its paragraphs ask for hyphenation', async ({ page }) => {
    const measured = await page.evaluate(() => {
      const article = document.querySelector('article.prose');
      /* A GFM callout is a `<p>` whose only child is a `<strong>`; it is excluded
       * for the same reason `prose-rhythm.spec.mjs` excludes it, and because it
       * carries a tint and italic rather than body text. */
      const paragraphs = [...article.querySelectorAll(':scope > p')].filter(
        (paragraph) => !paragraph.querySelector(':scope > strong:only-child'),
      );
      const targets = [article, ...paragraphs];

      return {
        paragraphs: paragraphs.length,
        values: [...new Set(targets.map((node) => getComputedStyle(node).hyphens))],
      };
    });

    /* A locator that resolved to nothing would report an empty value set and pass
     * the `not.toContain` below for the wrong reason. */
    expect(measured.paragraphs, 'the chapter rendered no prose paragraphs').toBeGreaterThan(0);
    expect(measured.values.length, 'nothing was measured').toBeGreaterThan(0);
    expect(measured.values, 'something on the page still asks for hyphenation').not.toContain(
      'auto',
    );
  });

  test('table cells still report exactly none, the value tables.spec.mjs asserts', async ({
    page,
  }) => {
    const hyphens = await page
      .locator('.prose table td, .prose table th')
      .evaluateAll((cells) => [...new Set(cells.map((cell) => getComputedStyle(cell).hyphens))]);

    /*
     * Byte-identical to `tables.spec.mjs` on purpose. These three rules are
     * unlayered and unconditional, so removing `hyphens-auto` upstream cannot
     * move this number — `none` is declared on the cells themselves, not
     * inherited past them. Were this to come back `['manual']` it would mean a
     * table rule had been deleted, and that spec would be failing too.
     */
    expect(hyphens).toEqual(['none']);
  });
});
