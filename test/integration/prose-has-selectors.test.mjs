/*
 * The prose asked Blink to walk its ancestors, and this file is the guard that says it no
 * longer does.
 *
 * Four compiled selectors used `:has()`, all pure layout: a GFM callout, a task list, and the
 * prose sibling gap's exclusion list twice. `:has()` is expensive to KEEP, not just to write —
 * per Blink's invalidation rules an attribute or class write on ANY element schedules an
 * ancestor-invalidation walk through every chain containing it. The heaviest chapter carries
 * 8,240 elements and this site mutates attributes in bulk — 84 `data-active` and 168
 * `aria-current` writes, plus 3,371 expressive-code token `style` attributes — so those walks
 * were constant, re-deriving an answer fixed since the markdown was parsed.
 *
 * `rehypeCallouts` in `src/lib/rehype-callouts.mjs` settles both predicates once at build time
 * and the sheet keys off its output: `CALLOUT_CLASS` on a `<p>` whose only ELEMENT child is a
 * `<strong>` (347 across the 36 built pages), `TASK_LIST_CLASS` on the `<ul>` holding a
 * `.task-list-item`. Both constants are imported here, so the sheet is pinned to the names the
 * transform writes. All of it reads the COMPILED sheet: two of the four were arbitrary variants
 * assembled in `src/pages/[...slug].astro`, two were authored rules in `global.css`. Whether the
 * gaps are the right SIZE is `test/e2e/prose-rhythm.spec.mjs`'s, which measures them.
 *
 * WHY PART IS STRUCTURAL. `ruleMatches` CANNOT evaluate an escaped Tailwind arbitrary variant:
 * `splitSelector` brackets depth on parentheses, not escapes, so the variant's escaped `>` reads
 * as a child combinator and splits the class name in two. `resolveToken` on an ordinary prose
 * paragraph therefore returns the plugin's `1.25em`, not the `0` `mb-0` writes, and those rules
 * are pinned structurally off `subjectChain`. The class-keyed rules are authored unescaped and
 * pinned behaviourally, which is why that half needs no such help.
 */
import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import {
  createContext,
  parseCompound,
  parseCompiledStylesheet,
  resolveToken,
  ruleMatches,
  selectorsDeclaring,
  splitSelector,
} from '../../test/support/css/css-cascade.mjs';
import { compileProjectStylesheet } from '../../test/support/css/tailwind-compile.mjs';
import { CALLOUT_CLASS, TASK_LIST_CLASS } from '../../src/lib/rehype-callouts.mjs';

const SLUG_PAGE = '../../src/pages/[...slug].astro';

/** The rhythm every top-level prose block is separated by: 1.6 of the body size. */
const RHYTHM = 'var(--prose-rhythm)';

/** The block margin a callout carries for itself, in place of the sibling gap. */
const CALLOUT_BLOCK_MARGIN = '2rem';

const compiled = compileProjectStylesheet();

/* A selector from its first child combinator onwards — the chain that reaches an element.
 * Cutting there is what lets `splitSelector` read a selector whose escaped prefix would
 * otherwise tokenise into nonsense (see the header). */
const subjectChain = (selector) => {
  const at = selector.indexOf(' > ');

  return (at === -1 ? selector : selector.slice(at)).trim();
};

/** The compound a selector's chain ends on — the element the rule styles. */
const subjectCompound = (selector) => splitSelector(subjectChain(selector)).at(-1)?.compound ?? '';

/** The `:not()` clauses of a selector's subject, as their inner arguments. */
const exclusionsOf = (selector) =>
  parseCompound(subjectCompound(selector))
    .filter((part) => part.kind === 'none')
    .map((part) => part.argument);

/** Every rule declaring `property` with exactly `value`. */
const declaring = (stylesheet, property, value) =>
  selectorsDeclaring(stylesheet, [property]).filter(
    (rule) => rule.declarations.get(property) === value,
  );

/** Exactly the rules whose selector is `selector` — not merely those matching it. */
const rulesFor = (stylesheet, property, selector) =>
  selectorsDeclaring(stylesheet, [property]).filter((rule) => rule.selector === selector);

/* Every selector in the sheet that still names `:has(`, with its layer. */
function selectorsWithHas(stylesheet) {
  return stylesheet.rules
    .filter((rule) => rule.selector.includes(':has('))
    .map((rule) => `${rule.layer ?? 'unlayered'} → ${rule.selector}`);
}

/* Real prose shapes. `proseParent` is the `<article class="prose">`, so a `<ul>` here is a
 * DESCENDANT of `.prose` — which is what `.prose ul.task-list` means, and why `task-list`
 * goes on the `<ul>` rather than on an element carrying `prose` itself. */
const proseParent = { types: ['article'], classes: ['prose'] };
const aSoleStrong = () => [createContext({ types: ['strong'] })];
/** A prose paragraph carrying neither stamped class. */
const ordinaryParagraph = createContext({ types: ['p'], ancestors: [proseParent] });
/** A callout paragraph as the build leaves it. `onlyChild` is what `:only-child` meant. */
const calloutParagraph = createContext({
  types: ['p'],
  classes: [CALLOUT_CLASS],
  ancestors: [proseParent],
  children: aSoleStrong(),
});
/** The same paragraph shape, un-stamped — what CSS used to be asked to work out. */
const unlabelledCalloutShape = createContext({
  types: ['p'],
  ancestors: [proseParent],
  children: aSoleStrong(),
});
/** A GFM task list's `<ul>`, and the same `<ul>` holding ordinary items. */
const taskList = createContext({
  types: ['ul'],
  classes: [TASK_LIST_CLASS],
  ancestors: [proseParent],
});
const ordinaryList = createContext({ types: ['ul'], ancestors: [proseParent] });

/* The `margin-bottom: 0` half of the arrangement, and the silent side of it. The gap and the
 * zero are one thing, not two rules near each other: `prose-rhythm.spec.mjs` reads `paragraphGap`
 * from one paragraph's bottom to the next one's top, so the rhythm must arrive from ONE side or
 * it measures `1.25em + the rhythm`. It is silent because the rule excludes the callout. Five
 * rules declare `margin-bottom: 0` and only this one styles a `p`; the subject compound
 * discriminates, the other four being Typography `:where()` chains and a `.mb-0`. */
function paragraphZeroRules(stylesheet) {
  const zeroes = declaring(stylesheet, 'margin-bottom', '0');

  return zeroes.filter((rule) =>
    parseCompound(subjectCompound(rule.selector)).some(
      (part) => part.kind === 'type' && part.name === 'p',
    ),
  );
}

test('the sweep below reaches the compiled sheet, and reaches its declarations', async () => {
  const stylesheet = parseCompiledStylesheet(await compiled);

  /* A POSITIVE CONTROL, and the reason the next test can be believed: "no selector uses
   * `:has(`" is the shape a walk that visited nothing also produces. The rule count proves
   * the sheet parsed — 596 today, across `@layer base`, `utilities` and the unlayered prose
   * block, all of which `parseCompiledStylesheet` descends into. The collector counts prove
   * the assertions reach DECLARATIONS rather than matching selector text. */
  expect(stylesheet.rules.length).toBeGreaterThan(300);
  expect(selectorsDeclaring(stylesheet, ['margin-top']).length).toBeGreaterThan(20);
  expect(selectorsDeclaring(stylesheet, ['margin-bottom']).length).toBeGreaterThan(20);
});

test('no compiled selector uses :has()', async () => {
  const css = await compiled;
  const offenders = selectorsWithHas(parseCompiledStylesheet(css));

  /* THE CLAIM. `parseCompiledStylesheet` reports `selector` as authored, so one entry per line
   * is one `:has(` in the CSS the browser receives, and the layer is named so a failure says
   * which half of the stylesheet is at fault.
   *
   * And the same claim over the raw output, because the rule walk is a parser: `collectRules`
   * skips the body of any at-rule it does not recognise, and a parser that stops walking should
   * not be the only thing between the claim and the stylesheet. The compiled file's two comments
   * are the Tailwind banner and Vite's module marker; both are stripped first, so a comment can
   * neither satisfy nor break this. */
  expect(offenders).toEqual([]);
  expect(css.replaceAll(/\/\*[\s\S]*?\*\//gu, '').includes(':has(')).toBe(false);
});

test('the prose sibling gap still lands on the rhythm token', async () => {
  const css = await compiled;
  const gaps = declaring(parseCompiledStylesheet(css), 'margin-top', RHYTHM);

  /* Exactly one rule supplies the gap; a second would compete with it on specificity for
   * every block on the page.
   *
   * `--spacing-prose-sibling` is a `@theme inline` token, so it is not IN the compiled file
   * at all: `mt-prose-sibling` emits `var(--prose-rhythm)` directly, and asserting the theme
   * token's name would assert a spelling the browser never sees. What it does see is
   * `--prose-rhythm` on `:root`, and this is the one place that identity is worth pinning,
   * because the rhythm is the whole point of the rule. */
  expect(gaps).toHaveLength(1);
  expect(
    resolveToken(
      css,
      createContext({ types: ['article'], classes: ['prose'], ancestors: [{ types: ['html'] }] }),
      '--prose-rhythm',
    ),
  ).toBe('calc(var(--type-body) * 1.6)');

  /* The chain is `> * + <exclusions>` and stays that way — a direct child of the prose
   * container preceded by a sibling, which is what makes the gap the gap BETWEEN blocks
   * rather than a top margin on the first one. */
  const chain = splitSelector(subjectChain(gaps[0].selector));

  expect(chain.map((part) => part.combinator)).toEqual(['>', '+']);
  expect(chain[0].compound).toBe('*');

  /* And the exclusions that are NOT about callouts must all survive: headings, because more
   * space above a heading than below it is what groups it with its text; `details`, `pre` and
   * `.expressive-code`, because each is a framed block with its own padding and rhythm. Only
   * the callout clause is the fix's business, and its spelling is not this file's. */
  expect(exclusionsOf(gaps[0].selector)).toEqual(
    expect.arrayContaining(['h2', 'h3', 'h4', 'details', 'pre', '.expressive-code']),
  );
});

test('an ordinary paragraph keeps margin-bottom: 0, and a callout keeps its own', async () => {
  const css = await compiled;
  const stylesheet = parseCompiledStylesheet(css);
  const zeroes = declaring(stylesheet, 'margin-bottom', '0');
  const paragraphs = paragraphZeroRules(stylesheet);

  expect(zeroes.length).toBeGreaterThan(1);
  expect(paragraphs).toHaveLength(1);
  expect(paragraphs[0].selector).toContain(`p:not(.${CALLOUT_CLASS})`);

  /* The other half of the arrangement, now class-keyed: the callout is excluded from the sibling
   * gap, so it supplies the 32px itself or it would sit flush against the block above it.
   * `prose-cascade.test.mjs` pins `border-block`; this pins the geometry. Asserted against the
   * constant `rehypeCallouts` exports rather than the string `callout` twice, so a rename on
   * either side fails here instead of leaving 347 paragraphs unstyled. */
  const calloutMargins = declaring(stylesheet, 'margin-block', CALLOUT_BLOCK_MARGIN);

  expect(calloutMargins).toHaveLength(1);
  expect(calloutMargins[0].selector).toBe(`.prose > p.${CALLOUT_CLASS}`);
  expect(calloutMargins[0].layer).toBeNull();
  expect(ruleMatches(calloutMargins[0].selector, calloutParagraph)).toBe(true);
  expect(resolveToken(css, calloutParagraph, 'margin-block')).toBe(CALLOUT_BLOCK_MARGIN);

  /* THE LOAD-BEARING NON-MATCH, and the whole difference this change makes. Under
   * `:has( > strong:only-child)` this same paragraph matched: the selector decided what a
   * callout was from what it CONTAINED, and `.callout` decides it from what the BUILD said. It
   * is also why the assertion could not be written before the fix — under the old selector it
   * was `true` for both contexts, and a test asserting something already true guards nothing. */
  expect(ruleMatches(calloutMargins[0].selector, unlabelledCalloutShape)).toBe(false);

  /* And an ordinary paragraph — no class, and not even the callout shape — is not a callout
   * either, and takes no block margin. The non-regression half: this is what keeps `.callout`
   * from spreading to every `<p>`, and it is a different assertion from the one above. */
  expect(ruleMatches(calloutMargins[0].selector, ordinaryParagraph)).toBe(false);

  /* The other side of the coin, and the half that was missing: the zero must still LAND on that
   * paragraph. Read through `subjectChain` — cutting the escaped prefix is what makes the subject
   * parseable at all (see the header); on the full selector `ruleMatches` returns false for every
   * context, so this is not a weaker check but the only one that can be made at all. */
  const zeroChain = subjectChain(paragraphs[0].selector);

  expect(ruleMatches(zeroChain, ordinaryParagraph)).toBe(true);
  expect(ruleMatches(zeroChain, calloutParagraph)).toBe(false);
});

test('a stamped task list loses its bullets, and an ordinary list keeps them', async () => {
  const css = await compiled;
  const stylesheet = parseCompiledStylesheet(css);
  const selector = `.prose ul.${TASK_LIST_CLASS}`;
  const rules = rulesFor(stylesheet, 'list-style-type', selector);

  /* Filtered by SELECTOR, not property: `@tailwindcss/typography` ships eleven
   * `list-style-type` declarations for `ol` variants and `ul` alone, plus `.list-none`, so the
   * rule that does this is not findable by property. The control shows the filter's reach. */
  expect(selectorsDeclaring(stylesheet, ['list-style-type']).length).toBeGreaterThan(5);
  expect(rules).toHaveLength(1);
  expect(rules[0].layer).toBeNull();
  expect(rules[0].declarations.get('list-style-type')).toBe('none');
  expect(rules[0].declarations.get('padding-inline-start')).toBe('0');

  /* Both properties, because the pair IS the fix: `list-style-type: none` removes the marker and
   * `padding-inline-start: 0` the indent it sat in. Keeping only one leaves a task list visibly
   * indented for a bullet it no longer draws. */
  expect(ruleMatches(selector, taskList)).toBe(true);
  expect(resolveToken(css, taskList, 'list-style-type')).toBe('none');
  expect(resolveToken(css, taskList, 'padding-inline-start')).toBe('0');

  /* And an ordinary `<ul>` in the same column is untouched — the Typography plugin still
   * declares `disc` for it. The unlayered `.prose ul.task-list` rule beats that on layer RANK
   * rather than specificity, so the class has to be present, not merely the rule. */
  expect(ruleMatches(selector, ordinaryList)).toBe(false);
  expect(resolveToken(css, ordinaryList, 'list-style-type')).toBe('disc');
});

test('the chapter template puts no :has() in proseClass', async () => {
  const source = await readFile(new URL(SLUG_PAGE, import.meta.url), 'utf8');
  const start = source.indexOf('const proseClass = [');
  const end = source.indexOf('].join(', start);

  expect(start, 'the chapter template no longer declares proseClass').toBeGreaterThan(-1);
  expect(end, 'the proseClass array is no longer joined into a string').toBeGreaterThan(start);

  /* Why a source assertion at all, when the file above covers the compiled sheet: because the
   * class string IS the mechanism. Two of the four selectors were Tailwind arbitrary variants
   * whose `:has()` existed only as characters in this array, assembled in a component rather
   * than declared in the stylesheet — so a fix that rewrote `global.css` alone would have left
   * them untouched and still compiled to a `:has(`. Comments come off first, so a future
   * author explaining one of these variants can write `:has(` without failing the test. */
  const block = source.slice(start, end).replaceAll(/\/\*[\s\S]*?\*\//gu, '');

  /* Three controls, so a slice that quietly matched nothing cannot pass. 57 class names are
   * joined onto the `<article>`, and two are the mechanism under change: the sibling-gap
   * variant at the top and `mb-0` further down. Both now name the class the transform
   * stamps, which is the substitution it made possible. */
  expect(block.split('\n').filter((line) => /^ {2}'/u.test(line)).length).toBeGreaterThan(40);
  expect(block).toContain('mt-prose-sibling');
  expect(block).toContain('mb-0');
  expect(block).toContain(`:not(.${CALLOUT_CLASS})`);

  expect(block).not.toContain(':has(');
});
