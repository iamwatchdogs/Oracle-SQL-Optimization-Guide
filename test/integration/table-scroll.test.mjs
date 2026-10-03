/**
 * The table scroll container: where the overflow lives, and what fills.
 *
 * Split out of `prose-cascade.test.mjs` because it is a different contract. That
 * file guards the prose block's LAYER MEMBERSHIP — that the authored rules are
 * unlayered so they beat the Typography plugin's `utilities` output. This one
 * guards a structural decision those rules encode: the `<table>` keeps its real
 * table box, and a wrapper the markdown pipeline builds owns the overflow.
 *
 * The two are entangled, which is why the failure mode is easy to reintroduce.
 * `overflow` is only honoured on a block container, inline container, or table
 * WRAPPER — never on a table box — so making the table the scroll container
 * clamps `overflow-x` back to `visible`, hands the overflow to the page, AND
 * drops the row groups into an anonymous fit-content box. A two-column table
 * then rendered 239px wide inside a 647px measure while still being the thing
 * meant to stop the page widening. No width hint on the groups, the rows, or the
 * cells could move it; only moving the container could.
 */
import { expect, test } from 'vitest';
import { parseCompiledStylesheet } from '../../test/support/css/css-cascade.mjs';
import { compileProjectStylesheet } from '../../test/support/css/tailwind-compile.mjs';

const compiled = compileProjectStylesheet();

const ruleFor = (sheet, selector) => sheet.rules.find((rule) => rule.selector === selector) ?? null;

const tableRules = async () => {
  const sheet = parseCompiledStylesheet(await compiled);
  return {
    scroll: ruleFor(sheet, '.prose .prose-table-scroll'),
    table: ruleFor(sheet, '.prose table'),
  };
};

test('the wrapper owns the overflow, not the table', async () => {
  const { scroll } = await tableRules();

  /*
   * `overscroll-behavior-x: contain` stops a horizontal swipe chaining to the
   * document, which is what let one wide table push a 390px phone to 914px
   * before the container moved off the table and into the tree.
   */
  expect(scroll.declarations.get('display')).toBe('block');
  expect(scroll.declarations.get('overflow-x')).toBe('auto');
  expect(scroll.declarations.get('overscroll-behavior-x')).toBe('contain');
  expect(scroll.declarations.get('max-width')).toBe('100%');
});

test('the table keeps its real table box and fills the measure', async () => {
  const { table } = await tableRules();

  expect(table.declarations.get('display')).toBe('table');
  expect(table.declarations.get('width')).toBe('100%');
  /* A table box never honours `overflow`, so declaring it there is a promise the
   * browser will not keep. Asserting its absence is what stops a future
   * "harmless" edit from quietly removing the scroll container. */
  expect(table.declarations.has('overflow-x')).toBe(false);
  expect(table.declarations.has('overscroll-behavior-x')).toBe(false);
  /* The wrapper carries the block margin now, so it must not be doubled. */
  expect(table.declarations.get('margin-block')).toBe('0');
});

test('the table header keeps a 1px hairline and nothing heavier', async () => {
  const sheet = parseCompiledStylesheet(await compiled);
  const thead = ruleFor(sheet, '.prose thead th');

  expect(thead.declarations.get('border-bottom')).toBe('1px solid var(--rule-strong)');
  for (const property of ['border-top', 'border-left', 'border-right', 'border']) {
    expect(thead.declarations.has(property)).toBe(false);
  }
});
