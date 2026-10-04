/*
 * `text-wrap: pretty` is a paragraph-level re-layout, not a paint hint.
 *
 * Blink runs it as an optimisation pass over the whole block — a last-line rag
 * check that costs an extra layout per paragraph. On a page whose prose carries
 * 228 `<p>`, 152 `<td>` and 24 `<th>`, that is 404 blocks paying a pass each, and
 * every one of the four `font-display: swap` faces triggers it again when it
 * lands and the metrics change underneath. Lighthouse reported 1,207 ms of
 * Rendering and 3,511 ms of Style & Layout on the heaviest chapter.
 *
 * THE FOUR PLACES, AND WHAT EACH ONE WAS PAYING FOR:
 *   - bare `p`                 — the 228 prose paragraphs. The only declaration
 *                                the rule carried, so the rule goes with it.
 *   - `details > summary`      — the site nav, the evidence key and the mobile
 *                                table of contents: short labels, mostly one line.
 *   - `.prose tbody/tfoot td`  — 152 cells, and a table cell is laid out as part
 *                                of the table's own block layout, not as prose.
 *   - `.prose tbody th`        — the row headers, ditto.
 *
 * Assertions run against the COMPILED sheet, never the source, for the reason
 * `tailwind-source-closure.test.mjs` gives at length: a declaration reached from
 * any declared source reaches the output whatever the source files say, so only
 * the compiled sheet can assert "nothing anywhere asks for this".
 */
import { expect, test } from 'vitest';
import {
  createContext,
  parseCompiledStylesheet,
  resolveToken,
  ruleMatches,
  splitSelector,
} from '../../test/support/css/css-cascade.mjs';
import { compileProjectStylesheet } from '../../test/support/css/tailwind-compile.mjs';

const compiled = compileProjectStylesheet();

/*
 * Every rule in the compiled sheet declaring `property`, whatever layer it was
 * emitted into. `@layer base` and the unlayered authored prose rules are two
 * homes for the same declaration, and a collector that read only one of them
 * would pass while the other still carried the cost.
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

const ruleFor = (stylesheet, selector) =>
  stylesheet.rules.find((rule) => rule.selector === selector) ?? null;

/*
 * lightningcss drops a leading zero, so `0 0.9rem 0.6rem` and `0.7rem 0.9rem`
 * do not survive as written. The padding the tables are read by is the
 * invariant; its spelling is not. `prose-cascade.test.mjs` compares the inline
 * component the same way. The unit is stripped before the conversion because
 * `Number('.9rem')` is `NaN` and `Number('.9')` is not — the whole difference
 * between asserting a length and asserting a string.
 */
const lengthsOf = (shorthand) =>
  String(shorthand ?? '')
    .split(/\s+/u)
    .filter(Boolean)
    .map((part) => Number(part.replace(/[a-z]+$/iu, '')));

/*
 * Every rule whose selector list ends in a chain whose SUBJECT is a bare `p`.
 *
 * `splitSelector` walks one chain, not a list — the comma stays inside the
 * compound it follows — so the list is split on commas first and each chain is
 * then reduced to its last compound, which is the element the rule actually
 * styles. Matching on the compound rather than on the string ` p` is what keeps
 * `.prose p` and `details p` from being counted as bare paragraphs.
 */
const bareParagraphRules = (stylesheet) =>
  stylesheet.rules.filter((rule) =>
    rule.selector
      .split(',')
      .map((chain) => chain.trim())
      .some((chain) => splitSelector(chain).at(-1)?.compound === 'p'),
  );

/* The three shipped disclosures: a `<summary>` directly inside a `<details>`. */
const disclosureSummary = createContext({
  types: ['summary'],
  ancestors: [{ types: ['details'] }, { types: ['div'], classes: ['w-shell'] }],
});

/* A paragraph inside the prose container — one of the 228 the bare `p` rule was
 * costing a re-layout pass on. */
const proseParagraphContext = createContext({
  types: ['p'],
  ancestors: [{ types: ['div'], classes: ['prose'] }, { types: ['article'] }],
});

/* A body cell in the heaviest chapter's widest table — one of the 152. */
const bodyCell = createContext({
  types: ['td'],
  ancestors: [
    { types: ['tr'] },
    { types: ['tbody'] },
    { types: ['table'] },
    { types: ['div'], classes: ['prose'] },
  ],
});

/* A row header — `prose-rhythm.spec.mjs` reads one of these. */
const rowHeader = createContext({
  types: ['th'],
  ancestors: [
    { types: ['tr'] },
    { types: ['tbody'] },
    { types: ['table'] },
    { types: ['div'], classes: ['prose'] },
  ],
});

test('no rule in the compiled sheet asks Blink for a paragraph-level re-layout', async () => {
  const stylesheet = parseCompiledStylesheet(await compiled);

  expect(withValue(stylesheet, 'text-wrap', 'pretty')).toEqual([]);

  /*
   * A sweep that found nothing because the WALK was broken would pass the line
   * above for the wrong reason. `overflow-wrap` is the sibling wrapping property
   * the sheet still ships on four rules, and it is here for no purpose other
   * than to prove the collector reaches real declarations.
   */
  expect(declarationsOf(stylesheet, 'overflow-wrap').length).toBeGreaterThan(0);
});

test('the bare p rule is gone, and nothing was invented in its place', async () => {
  const stylesheet = parseCompiledStylesheet(await compiled);

  /*
   * `p { text-wrap: pretty }` WAS THE ONLY DECLARATION IN ITS RULE, so removing
   * `pretty` deletes the rule outright — `parseCompiledStylesheet` reports a
   * bare `p` carrying exactly one declaration and nothing else. The assertion
   * is therefore ABSENCE. It holds whether or not an empty `p { }` block is
   * left behind in the source, because lightningcss drops a rule with no
   * declarations rather than emitting it, so an orphaned block would not
   * reappear in the compiled sheet either.
   */
  expect(stylesheet.rules.filter((rule) => rule.selector === 'p')).toEqual([]);

  /*
   * And NOBODY TOOK ITS PLACE. Whatever still matches a bare `p` subject is
   * either a Tailwind typography utility in the `utilities` layer or the prose
   * scope rule, which is the only place a bare-paragraph declaration may
   * legitimately live. This is the control that separates "the rule was deleted"
   * from "the rule was deleted and a replacement was written", and it is live:
   * four such rules survive, so the loop is not vacuous.
   */
  for (const rule of bareParagraphRules(stylesheet)) {
    expect(
      rule.layer === 'utilities' || rule.selector === '.prose, .prose p',
      `${rule.selector} is a bare-paragraph rule that belongs to neither`,
    ).toBe(true);
  }

  const proseParagraph = ruleFor(stylesheet, '.prose, .prose p');

  expect(proseParagraph, 'the prose paragraph rule no longer exists').not.toBeNull();
  expect(proseParagraph.declarations.get('hyphens')).toBe('none');
  expect(ruleMatches(proseParagraph.selector, proseParagraphContext)).toBe(true);
});

test('the disclosure summary still sets cursor, colour, list-style and transition', async () => {
  const stylesheet = parseCompiledStylesheet(await compiled);
  const rule = ruleFor(stylesheet, 'details > summary');
  const declarations = rule?.declarations;

  expect(rule, 'no unlayered rule for details > summary').not.toBeNull();
  expect(rule.layer).toBeNull();
  expect(ruleMatches(rule.selector, disclosureSummary)).toBe(true);
  expect(declarations.get('cursor')).toBe('pointer');
  expect(declarations.get('color')).toBe('var(--ink-muted)');
  expect(declarations.get('list-style')).toBe('none');
  /*
   * Named, timed, and on the disclosure curve. Matched rather than compared
   * because the compiled form normalises 180ms and 0.22 to `.18s` and `.22`,
   * and the invariant is that the summary still animates its colour on that
   * curve — not which way the minifier rounds it.
   */
  expect(declarations.get('transition')).toMatch(
    /^color (?:\.18|0\.18)s cubic-bezier\(\.22, 1, \.36, 1\)$/u,
  );
});

test('body cells still align to the top of their row', async () => {
  const css = await compiled;
  const stylesheet = parseCompiledStylesheet(css);
  const rule = ruleFor(stylesheet, '.prose tbody td, .prose tfoot td');

  /*
   * `vertical-align: top` is the load-bearing declaration on this rule and the
   * one `prose-rhythm.spec.mjs` and `tables.spec.mjs` are written against, so it
   * is asserted RESOLVED rather than merely declared. The Typography plugin sets
   * `:where(tbody td) { vertical-align: baseline }` in the `utilities` layer,
   * and baseline — which aligns the first baseline of each cell — is what makes
   * a row mixing a one-word `<code>` chip with a three-line SQL snippet come out
   * visibly ragged. `top` aligns every cell's first line instead. Asserting the
   * declaration alone would pass in a world where the plugin's baseline still
   * won; only the resolved value says which one a `<td>` actually gets.
   */
  expect(rule, 'no unlayered rule for .prose tbody td, .prose tfoot td').not.toBeNull();
  expect(rule.layer).toBeNull();
  expect(ruleMatches(rule.selector, bodyCell)).toBe(true);
  expect(rule.declarations.get('vertical-align')).toBe('top');
  expect(resolveToken(css, bodyCell, 'vertical-align')).toBe('top');
  expect(lengthsOf(rule.declarations.get('padding'))).toEqual([0.7, 0.9]);
  expect(rule.declarations.get('border-bottom')).toBe('1px solid var(--rule)');
  expect(rule.declarations.get('color')).toBe('var(--ink-muted)');
});

test('body row headers still carry the sans face, the cell padding and the rule', async () => {
  const stylesheet = parseCompiledStylesheet(await compiled);
  const rule = ruleFor(stylesheet, '.prose tbody th');
  const declarations = rule?.declarations;

  expect(rule, 'no unlayered rule for .prose tbody th').not.toBeNull();
  expect(rule.layer).toBeNull();
  expect(ruleMatches(rule.selector, rowHeader)).toBe(true);
  expect(declarations.get('font-family')).toBe('var(--font-sans)');
  expect(declarations.get('font-size')).toBe('var(--type-ui)');
  expect(declarations.get('font-weight')).toBe('600');
  expect(declarations.get('text-align')).toBe('start');
  expect(lengthsOf(declarations.get('padding'))).toEqual([0.7, 0.9]);
  expect(declarations.get('border-bottom')).toBe('1px solid var(--rule)');
  expect(declarations.get('color')).toBe('var(--ink)');
});
