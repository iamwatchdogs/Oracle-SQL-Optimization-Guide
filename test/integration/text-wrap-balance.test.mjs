/*
 * `text-wrap: balance` is a line-breaking pass, not a paint hint.
 *
 * Blink measures the block once to get an ideal line count and then bisects
 * toward it, re-laying the block out on every probe. The base rule below reaches
 * every heading in the book, and the heaviest chapter carries 42 of them — so
 * the pass runs 42 times on first layout, and again for each of the four
 * `font-display: swap` faces when it lands and the metrics change underneath.
 * Lighthouse put 3,511 ms in Style & Layout and 1,207 ms in Rendering on that
 * page. `.prose thead th` pays it too, across 24 header cells, for a hint that
 * only ever affects lines a header actually wraps onto.
 *
 * EVERYTHING HERE IS ASSERTED AGAINST THE COMPILED SHEET, because a source-level
 * check cannot see the other half of the problem. A `text-wrap: balance` reached
 * through a Tailwind utility would live in the `utilities` layer and pass every
 * grep of `global.css` below while costing exactly the same to lay out. The
 * compiled sheet is the only level at which "nothing anywhere asks for this" is
 * checkable — which is also why the pager class is read from its source file
 * rather than from the compiled sheet: see the last test.
 */
import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import {
  createContext,
  parseCompiledStylesheet,
  ruleMatches,
  splitSelector,
} from '../../test/support/css/css-cascade.mjs';
import { compileProjectStylesheet } from '../../test/support/css/tailwind-compile.mjs';

const compiled = compileProjectStylesheet();

const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6';

/*
 * Built from fragments so this spec cannot be the reason the utility exists.
 * Same reasoning, and the same comment, as `splitName` in
 * `tailwind-source-closure.test.mjs`: a negative assertion must not be a place
 * that introduces what it forbids.
 */
const BALANCE_UTILITY = ['text-wrap', 'balance'].join('-');

/*
 * Every rule in the compiled sheet that declares `property`, whatever layer it
 * was emitted into. This is the walk the whole spec rests on: `@layer base` and
 * the unlayered authored prose rules are two different homes for the same
 * declaration, and a collector that only looked at one of them would pass while
 * the other still carried the cost.
 */
const declarationsOf = (stylesheet, property) =>
  stylesheet.rules
    .filter((rule) => rule.declarations.has(property))
    .map((rule) => ({
      selector: rule.selector,
      layer: rule.layer,
      value: rule.declarations.get(property).trim().toLowerCase(),
    }));

const withValue = (stylesheet, property, value) =>
  declarationsOf(stylesheet, property)
    .filter((entry) => entry.value === value)
    .map((entry) => `${entry.selector} → ${entry.value}`);

/*
 * `splitSelector` walks ONE chain, not a selector list — the comma stays inside
 * the compound it follows. So the list is split on commas first and each chain
 * is then reduced to its subject. That is what makes "all six heading tags are
 * still in this selector" checkable, instead of a substring match on a selector
 * that would also match `h1, h2, h3` or a `h1:hover` variant.
 */
const subjectsOf = (selector) =>
  selector
    .split(',')
    .flatMap((chain) => splitSelector(chain.trim()))
    .map((part) => part.compound);

/*
 * A real chapter heading: an `<h2>` carrying the hash target that
 * `scroll-margin-top` exists to clear, inside the prose container, inside the
 * article. The ancestors are not decoration — the authored heading rule sits in
 * `@layer base`, and the point is that it is still REACHABLE from where it
 * always was, not merely that its text survives somewhere in the file.
 */
const chapterHeading = createContext({
  types: ['h2'],
  attributes: { id: 'why-evidence-grades' },
  ancestors: [{ types: ['div'], classes: ['prose'] }, { types: ['article'] }],
});

/* A `<th>` in a `<thead>` of a prose table: one of the 24 header cells. */
const tableHeaderCell = createContext({
  types: ['th'],
  ancestors: [
    { types: ['tr'] },
    { types: ['thead'] },
    { types: ['table'] },
    { types: ['div'], classes: ['prose'] },
  ],
});

/*
 * lightningcss drops a leading zero, so `-0.02em` compiles to `-.02em` and the
 * text of a length is not stable across a minifier bump. The tight tracking on
 * 42 headings is the invariant; its spelling is not. `prose-cascade.test.mjs`
 * compares the inline padding component the same way. The unit is stripped
 * before the conversion because `Number('.9rem')` is `NaN` and `Number('.9')` is
 * not, which is the whole difference between asserting a length and asserting a
 * string.
 */
const lengthsOf = (shorthand) =>
  String(shorthand ?? '')
    .split(/\s+/u)
    .filter(Boolean)
    .map((part) => Number(part.replace(/[a-z]+$/iu, '')));

/*
 * Every quoted string in a component that carries `token` as one of its class
 * names — `class="…"`, and the entries of a `class:list` array, both land here.
 *
 * Matching on quoted literals rather than on the file's text is what keeps a
 * failure readable. A `not.toContain` over the source of a 136-line component
 * prints the whole component back, which buries the one line that says what is
 * wrong; this returns the offending class string and nothing else. Splitting on
 * whitespace is what makes it a CLASS-list claim rather than a substring claim,
 * so `text-balance` can never satisfy a check written for `text-wrap-balance`.
 */
const classesCarrying = (source, token) =>
  [...source.matchAll(/'([^'\n]*)'|"([^"\n]*)"/gu)]
    .map((match) => match[1] ?? match[2] ?? '')
    .filter((literal) => literal.split(/\s+/u).includes(token));

/*
 * Tailwind's preflight ships a `h1…h6` rule of its own — `font-size: inherit;
 * font-weight: inherit` — so "the heading rule" cannot be found by selector
 * alone. `scroll-margin-top` is the discriminator: it is what keeps a hash
 * target clear of the 48px sticky header, and preflight does not touch it.
 */
const authoredHeadingRule = (stylesheet) =>
  stylesheet.rules.find(
    (rule) => rule.selector === HEADING_SELECTOR && rule.declarations.has('scroll-margin-top'),
  ) ?? null;

test('no rule in the compiled sheet asks Blink for a balanced line-breaking pass', async () => {
  const stylesheet = parseCompiledStylesheet(await compiled);

  expect(withValue(stylesheet, 'text-wrap', 'balance')).toEqual([]);

  /*
   * A sweep that finds nothing because the WALK is broken would pass the line
   * above for entirely the wrong reason. `overflow-wrap` is the sibling wrapping
   * property the sheet still ships on four rules, and it is asserted here for no
   * other purpose than to prove the collector reaches real declarations.
   */
  expect(declarationsOf(stylesheet, 'overflow-wrap').length).toBeGreaterThan(0);
});

test('the heading rule survives with every declaration the removal left behind', async () => {
  const stylesheet = parseCompiledStylesheet(await compiled);
  const rule = authoredHeadingRule(stylesheet);
  const declarations = rule?.declarations;

  expect(rule, `no authored rule for ${HEADING_SELECTOR}`).not.toBeNull();
  expect(subjectsOf(rule.selector)).toEqual(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
  expect(ruleMatches(rule.selector, chapterHeading)).toBe(true);
  expect(declarations.get('font-family')).toBe('var(--font-serif)');
  expect(declarations.get('line-height')).toBe('var(--tight-leading)');
  expect(declarations.get('font-weight')).toBe('600');
  expect(declarations.get('color')).toBe('var(--ink)');
  expect(declarations.get('scroll-margin-top')).toBe('5rem');
  expect(lengthsOf(declarations.get('letter-spacing'))).toEqual([-0.02]);
});

test('the prose table header rule survives with every other declaration intact', async () => {
  const stylesheet = parseCompiledStylesheet(await compiled);
  const rule = stylesheet.rules.find((entry) => entry.selector === '.prose thead th');
  const declarations = rule?.declarations;

  expect(rule, 'no unlayered rule for .prose thead th').not.toBeNull();
  expect(rule.layer).toBeNull();
  expect(ruleMatches(rule.selector, tableHeaderCell)).toBe(true);
  expect(declarations.get('font-family')).toBe('var(--font-sans)');
  expect(declarations.get('font-size')).toBe('var(--type-chip)');
  expect(declarations.get('font-weight')).toBe('600');
  expect(declarations.get('text-transform')).toBe('uppercase');
  expect(declarations.get('text-align')).toBe('start');
  expect(declarations.get('vertical-align')).toBe('bottom');
  expect(declarations.get('border-bottom')).toBe('1px solid var(--rule-strong)');
  expect(declarations.get('color')).toBe('var(--ink)');
  expect(lengthsOf(declarations.get('letter-spacing'))).toEqual([0.06]);
  expect(lengthsOf(declarations.get('padding'))).toEqual([0, 0.9, 0.6]);
});

test('the pager link no longer carries the balance utility in its class list', async () => {
  const source = await readFile(
    new URL('../../src/components/PrevNext.astro', import.meta.url),
    'utf8',
  );
  const pagerTitles = classesCarrying(source, 'text-pager');

  /*
   * SOURCE LEVEL ON PURPOSE, and this is the one assertion in the spec that has
   * to be. The utility compiles to nothing at all: `text-wrap-balance` is not a
   * Tailwind v4 class — the real one is `text-balance` — so the compiled sheet
   * contains no `.text-wrap-balance` rule to assert on, before the fix or after
   * it. The class is dead weight in a class string, and only the string can say
   * so. The first test is the one that guards layout cost; this one guards the
   * declaration that was never paying any.
   */
  expect(classesCarrying(source, BALANCE_UTILITY)).toEqual([]);

  /*
   * And the removal was surgical. One class string carries the serif pager
   * treatment both pager cells are built on, and it still carries the rest of
   * itself — the token went, the class did not.
   */
  expect(pagerTitles).toHaveLength(1);
  expect(pagerTitles[0].split(/\s+/u)).toEqual(
    expect.arrayContaining(['text-pager', 'group-hover:text-accent']),
  );
});
