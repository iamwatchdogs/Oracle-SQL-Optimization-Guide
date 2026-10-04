/*
 * `hyphens: auto` is the most expensive thing in Blink's line breaker, and it is
 * expensive twice over.
 *
 * The hyphenator runs a pattern-matching pass over every text run at layout time.
 * `auto` also names a LANGUAGE, and the dictionary for that language is
 * LAZY-LOADED: the arrival of that dictionary changes where lines break, a
 * layout change invalidates the whole document, and the page reflows a second
 * time. On the heaviest chapter that is 391 KB of article text, and each of the
 * four `font-display: swap` faces arriving afterwards re-runs the pass with new
 * metrics underneath it.
 *
 * `hyphens` is INHERITED, so the two utilities this change deletes reached
 * everything: `hyphens-auto` on the `<article class="prose">` itself and
 * `prose-p:hyphens-auto` on the paragraphs inside it. The chapter template's
 * `proseClass` list is the only place either name is written, and that string is
 * the mechanism — Tailwind reads it, emits `.hyphens-auto` and
 * `.prose-p\:hyphens-auto …` into the `utilities` layer, and those are the only
 * two rules in the book that ask for the pass.
 *
 * WHICH SHAPE THE THIRD TEST TAKES, AND WHY: the surviving `none` declarations.
 *
 * `hyphens` has initial value `manual`, and `manual` is NOT `none`:
 * `manual` means "hyphenate only where the content says there is a soft hyphen"
 * and `none` means "never". So removing the two `auto` utilities leaves the eight
 * remaining rules redundant as CASCADE OVERRIDES — nothing upstream sets `auto`
 * or `manual` any more, so `none` and the initial value agree. They are not
 * redundant as DECLARATIONS, for three reasons that are all checked somewhere:
 *
 *   1. The corpus has no soft hyphen to suppress. `manual` and `none` are only
 *      indistinguishable while no text carries U+00AD or `&shy;` — all 37
 *      content files, 889,382 bytes, contain neither, so `none` is the accurate
 *      spelling of what the page does rather than a promise about the future.
 *   2. `text-wrap-pretty.test.mjs` asserts the `.prose, .prose p` rule exists and
 *      carries `hyphens: none`. Deleting the `@media (max-width: 39.999rem)`
 *      block with it breaks a spec written by someone else.
 *   3. `test/e2e/tables.spec.mjs` asserts computed `['none']` on every table cell.
 *      Deleting the three table rules flips that to `manual` on all four browser
 *      projects and breaks the assertion.
 *
 * So the third test pins the exact set of surviving selectors and the exact set
 * of surviving values. That is a deliberate contract, not a description: if a
 * later change decides the `none` declarations should go too, THIS TEST FAILS
 * first and names them, which is the outcome that should be reviewed rather than
 * discovered in a diff.
 *
 * Assertions run against the COMPILED sheet wherever a declaration could come
 * from anywhere, for the reason `text-wrap-balance.test.mjs` gives at length: a
 * `hyphens: auto` reached through a Tailwind utility lives in the `utilities`
 * layer and would pass every grep of `global.css` while costing exactly the same
 * to lay out. The one exception is the second test, which reads the template
 * source, because there the CLASS LIST is the thing being changed.
 *
 * AND ONE THING THIS SPEC DELIBERATELY DOES NOT USE: `resolveToken`. It looks
 * like the right tool for "what does a cell get" and it is wrong for this
 * property. `collectRules` in `css-cascade.mjs` recurses into `@media` and keeps
 * no condition, so the narrow-viewport rule is indistinguishable from an
 * unconditional one — and because authored prose rules are unlayered, they rank
 * above the `utilities` layer, so `resolveToken` reports `none` for the article
 * EVEN WITH `hyphens-auto` ON IT. A 1280px browser says `auto`. The computed
 * value is the e2e spec's job; see `test/e2e/hyphens.spec.mjs`.
 */
import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import {
  createContext,
  parseCompiledStylesheet,
  ruleMatches,
  selectorsDeclaring,
} from '../../test/support/css/css-cascade.mjs';
import { compileProjectStylesheet } from '../../test/support/css/tailwind-compile.mjs';

const compiled = compileProjectStylesheet();

const PROSE_SOURCE = new URL('../../src/pages/[...slug].astro', import.meta.url);

/*
 * lightningcss emits BOTH spellings beside each other, and they are not
 * interchangeable: WebKit has honoured `-webkit-hyphens` for far longer than the
 * unprefixed name, so a sweep over `hyphens` alone would leave a real engine
 * unexamined on the `webkit` project. Ten rules carry one or the other today.
 */
const HYPHEN_PROPERTIES = ['hyphens', '-webkit-hyphens'];

/*
 * Built from fragments so this spec can never be the reason the utility exists —
 * a negative assertion must not be a place that introduces what it forbids. Same
 * reasoning, and same comment, as `BALANCE_UTILITY` in
 * `text-wrap-balance.test.mjs`.
 */
const AUTO_UTILITIES = [['hyphens', 'auto'].join('-'), ['prose-p', 'hyphens', 'auto'].join(':')];

/*
 * Every compiled rule declaring either spelling, whatever layer it was emitted
 * into. Ten rules before the change, eight after — but TWENTY rows here, because
 * lightningcss writes `-webkit-hyphens` immediately above `hyphens` in each of
 * them. So this is the sweep for "does anything ask for the pass", where a
 * duplicated line is harmless, and `hyphenNoneRules` below is the structural
 * contract, where it is not.
 */
const hyphenRules = (stylesheet) =>
  HYPHEN_PROPERTIES.flatMap((property) =>
    selectorsDeclaring(stylesheet, [property]).map((rule) => ({
      selector: rule.selector,
      layer: rule.layer,
      property,
      value: rule.declarations.get(property).trim().toLowerCase(),
    })),
  );

/*
 * One row per RULE rather than per spelling, for the assertions that count rules
 * and name selectors. The unprefixed name is the one to key on: it is what every
 * authored declaration in `global.css` says, and it is what the plugin emits
 * beside the prefixed one.
 */
const hyphenNoneRules = (stylesheet) =>
  selectorsDeclaring(stylesheet, ['hyphens']).map((rule) => ({
    selector: rule.selector,
    layer: rule.layer,
    value: rule.declarations.get('hyphens').trim().toLowerCase(),
  }));

/*
 * Every quoted string in a component that carries `token` as one of its class
 * names — `class="…"`, and the entries of a `class:list` array, both land here.
 * Matching quoted literals rather than the file's text is what keeps a failure
 * readable: a `not.toContain` over a 562-line page prints the whole page back.
 * Splitting on whitespace makes this a CLASS-list claim, so `prose-p:hyphens-auto`
 * can never be satisfied by the bare `hyphens-auto` string, or the reverse.
 */
const classesCarrying = (source, token) =>
  [...source.matchAll(/'([^'\n]*)'|"([^"\n]*)"/gu)]
    .map((match) => match[1] ?? match[2] ?? '')
    .filter((literal) => literal.split(/\s+/u).includes(token));

/*
 * The leading class of a compiled selector, unescaped. The typography plugin
 * writes `.prose-h2\:hyphens-none :where(h2)…`, so this recovers the source
 * variant name and the test never has to paste 74 characters of escaping that a
 * plugin bump would rewrite into a fake regression.
 */
const variantOf = (selector) =>
  /^\.((?:\\.|[^\s\\:.])+)/u.exec(selector)?.[1].replaceAll('\\:', ':');

/* The five authored rules, by the exact selector the compiled sheet emits. */
const AUTHORED_HYPHEN_NONE_SELECTORS = [
  '.prose, .prose p',
  '.prose thead th',
  '.prose tbody td, .prose tfoot td',
  '.prose tbody th',
  '.prose :not(pre) > code',
];

/* The three typography variants the chapter template still asks for. */
const EXPECTED_VARIANTS = [
  'prose-h2:hyphens-none',
  'prose-h3:hyphens-none',
  'prose-h4:hyphens-none',
];

/* A header cell in the heaviest chapter's widest table — one of the 24. */
const headerCell = createContext({
  types: ['th'],
  ancestors: [
    { types: ['tr'] },
    { types: ['thead'] },
    { types: ['table'] },
    { types: ['div'], classes: ['prose-table-scroll'] },
    { types: ['article'], classes: ['prose'] },
  ],
});

/* A body cell — one of the 152. */
const bodyCell = createContext({
  types: ['td'],
  ancestors: [
    { types: ['tr'] },
    { types: ['tbody'] },
    { types: ['table'] },
    { types: ['div'], classes: ['prose-table-scroll'] },
    { types: ['article'], classes: ['prose'] },
  ],
});

test('no rule in the compiled sheet asks for a dictionary hyphenation pass', async () => {
  const stylesheet = parseCompiledStylesheet(await compiled);
  const asking = hyphenRules(stylesheet).filter((rule) => rule.value === 'auto');

  /* Each rule appears twice, once per spelling, so the property is named: two
   * rules asking for the pass is four lines, not two. */
  expect(asking.map((rule) => `${rule.property}: ${rule.selector} → ${rule.value}`)).toEqual([]);

  /*
   * A sweep that finds nothing because the WALK was broken would pass the line
   * above for the wrong reason. `overflow-wrap` is the sibling wrapping property
   * the sheet still ships on four rules, and it is here for no other purpose
   * than to prove the collector reaches real declarations — the same control
   * `text-wrap-pretty.test.mjs` and `text-wrap-balance.test.mjs` both use.
   */
  expect(hyphenRules(stylesheet).length).toBeGreaterThan(0);
  expect(
    selectorsDeclaring(stylesheet, ['overflow-wrap']).length,
    'the collector reaches no declarations at all',
  ).toBeGreaterThan(0);
});

test('the chapter template no longer asks for hyphenation in its class list', async () => {
  const source = await readFile(PROSE_SOURCE, 'utf8');

  for (const utility of AUTO_UTILITIES) {
    expect(classesCarrying(source, utility), `${utility} is still in proseClass`).toEqual([]);
  }

  /*
   * AND THE REMOVAL WAS SURGICAL. Three `hyphens-none` variants are still in the
   * list, one per heading level the template styles, and they are the survivors
   * the third test pins. If the whole hyphenation vocabulary had been swept out
   * of the template instead, this would be empty too.
   */
  expect(AUTO_UTILITIES.every((utility) => classesCarrying(source, utility).length === 0)).toBe(
    true,
  );
  expect(
    EXPECTED_VARIANTS.map((variant) => classesCarrying(source, variant).length),
    'a hyphens-none variant left proseClass',
  ).toEqual([1, 1, 1]);
});

test('every surviving hyphens declaration is none, on a named selector', async () => {
  const stylesheet = parseCompiledStylesheet(await compiled);
  const rules = hyphenNoneRules(stylesheet);

  expect(new Set(rules.map((rule) => rule.value))).toEqual(new Set(['none']));

  const utilities = rules.filter((rule) => rule.layer === 'utilities');
  const authored = rules.filter((rule) => rule.layer === null);

  expect(utilities.map((rule) => variantOf(rule.selector)).toSorted()).toEqual(EXPECTED_VARIANTS);
  expect(authored.map((rule) => rule.selector).toSorted()).toEqual(
    AUTHORED_HYPHEN_NONE_SELECTORS.toSorted(),
  );
  /* And the split is total: three utility rules plus five authored rules is
   * eight, and nothing else in the sheet declares the property. */
  expect(rules).toHaveLength(8);

  /*
   * The prefixed spelling says the same thing on the same eight rules. WebKit
   * has honoured `-webkit-hyphens` for far longer than the unprefixed name, so
   * asserting only the unprefixed half above would leave that engine unexamined
   * — and a `-webkit-hyphens: auto` paired with a `hyphens: none` is exactly the
   * shape that keeps the pass alive on one browser.
   */
  expect(
    hyphenRules(stylesheet)
      .map((rule) => `${rule.property}:${rule.selector}:${rule.value}`)
      .toSorted(),
  ).toEqual(
    rules
      .flatMap((rule) =>
        HYPHEN_PROPERTIES.map((property) => `${property}:${rule.selector}:${rule.value}`),
      )
      .toSorted(),
  );
});

test('the surviving none rules are still reachable from a table cell', async () => {
  const stylesheet = parseCompiledStylesheet(await compiled);
  const ruleFor = (selector) => stylesheet.rules.find((rule) => rule.selector === selector);
  const header = ruleFor('.prose thead th');
  const body = ruleFor('.prose tbody td, .prose tfoot td');
  const media = ruleFor('.prose, .prose p');

  /*
   * REACHABILITY, not text. A selector can survive verbatim in the compiled
   * sheet while the element it was written for stopped being a descendant of
   * `.prose` — `rehypeTableScroll` already inserts a wrapper between the prose
   * container and the table box, and descendant matching does not care, which is
   * why the wrapper is in these contexts. This is the assertion that says the
   * `none` guards still guard something.
   */
  expect(header.layer, 'the header rule was re-layered and now loses the cascade').toBeNull();
  expect(body.layer, 'the body rule was re-layered and now loses the cascade').toBeNull();
  expect(ruleMatches(header.selector, headerCell)).toBe(true);
  expect(ruleMatches(body.selector, bodyCell)).toBe(true);
  expect(header.declarations.get('hyphens')).toBe('none');
  expect(body.declarations.get('hyphens')).toBe('none');

  /*
   * The narrow-viewport block keeps its long comment — the one that explains
   * why hyphenation is harmful at phone measure — and that comment is the
   * project's own record of the decision this change generalises. The rule it
   * guards is the one still standing.
   */
  expect(media, 'the max-width: 39.999rem rule is gone').not.toBeNull();
  expect(media.declarations.get('hyphens')).toBe('none');
});
