/**
 * `text-rendering: optimizeLegibility` and `-webkit-text-size-adjust: 100%` are
 * LAYOUT requests, not paint hints, and `src/styles/global.css` used to ask for
 * both on `html`.
 *
 * WHY `optimizeLegibility` IS THE EXPENSIVE ONE. The value's whole content is
 * "enable kerning and optional ligatures", and the price is that Blink leaves the
 * integer-metrics fast path for shaped text: every one of those text nodes is laid
 * out against real font metrics rather than rounded advance widths. The heaviest
 * chapter carries 7,160 text nodes, so the request is 7,160 shaped layout boxes
 * instead of 7,160 rounded ones. The initial value is `auto`, which keeps the fast
 * path, so removing the declaration is what buys the cheap layout — and that is why
 * the assertions below reject ANY value, `auto` included, rather than only the one
 * being removed.
 *
 * WHY THE THREE `text-size-adjust` SPELLINGS ARE THREE SEPARATE PROPERTIES. To the
 * CSS cascade `-webkit-text-size-adjust`, `-moz-text-size-adjust` and
 * `text-size-adjust` are three unrelated names that happen to share a stem; a
 * declaration in one of them never satisfies a query for another. Only Blink
 * honours the PREFIXED spelling, which is the one `global.css` wrote, so a fix that
 * removed only the unprefixed name would leave the engine's behaviour identical
 * while satisfying a naive single-name test. This file therefore sweeps all three,
 * and the sweep is deliberately case-insensitive because `parseCompiledStylesheet`
 * keys declarations by the bytes in the compiled sheet, not by a normalised name.
 *
 * WHY THE COMPILED SHEET. The declarations being removed sit in `@layer base`,
 * Tailwind's utilities land in `utilities`, and Tailwind's preflight emits its own
 * `html, :host` rule in `base`. A source regex sees none of that: it would miss a
 * utility reintroduced through a template and it would miss a nested at-rule. So
 * this compiles `src/styles/global.css` through the project's own Vite + Tailwind
 * pipeline (`compileProjectStylesheet()`) and walks the RESULT, the approach
 * `scroll-behavior.test.mjs`, `text-wrap-pretty.test.mjs` and
 * `text-wrap-balance.test.mjs` already use.
 *
 * WHAT THE COMPILED SHEET SAYS ABOUT THE SECOND PROPERTY — READ BEFORE MERGING.
 * Tailwind's preflight ALREADY sets `-webkit-text-size-adjust: 100%` on `html, :host`
 * (`node_modules/tailwindcss/preflight.css:31`, reached because `global.css:22`
 * imports `tailwindcss`). So the authored declaration on `html` is a duplicate of a
 * baseline the framework already installs, in the same layer, on the same element.
 * Removing it therefore removes the DUPLICATE and nothing else: the text-size-adjust
 * metrics pass this fix is claimed to eliminate is still installed by preflight after
 * it lands. The post-fix state asserted below is "exactly one declaration remains and
 * it is the framework's", which is the true and checkable claim. If the intent is to
 * stop the pass rather than to stop repeating yourself, that is a different change —
 * it needs preflight neutralised or overridden, and it should be measured again
 * afterwards rather than assumed from the deletion.
 *
 * WHAT IS DELIBERATELY NOT HERE. Nothing in `test/` asserted on either property
 * before this file — `rg -n 'text-rendering|text-size-adjust|optimizeLegibility'`
 * across `test/` returns no matches — so no existing expectation moves. Whether a
 * layout is actually cheaper is a runtime property of the browser and belongs with
 * the Lighthouse trace, not with a stylesheet assertion.
 */
import { expect, test } from 'vitest';
import {
  createContext,
  parseCompiledStylesheet,
  ruleMatches,
  selectorsDeclaring,
} from '../../test/support/css/css-cascade.mjs';
import { compileProjectStylesheet } from '../../test/support/css/tailwind-compile.mjs';

const compiled = compileProjectStylesheet();

/** Every spelling of the text-size-adjust property, as three separate cascade names. */
const TEXT_SIZE_ADJUST = new Set([
  '-webkit-text-size-adjust',
  '-moz-text-size-adjust',
  'text-size-adjust',
]);

/** Preflight's own rule. Framework baseline, not something this project authors. */
const PREFLIGHT_ROOT = 'html, :host';

/**
 * Every declaration of `property` in the compiled sheet, whatever layer it was
 * emitted into and whatever the property was spelled. Matching on a lowercased key
 * rather than on `declarations.has(property)` is what makes the sweep spelling- and
 * case-proof: a later edit that reached for the unprefixed name, or for an uppercase
 * prefix, would otherwise slip between the map lookup and the assertion.
 */
const declarationsOf = (stylesheet, property) =>
  stylesheet.rules.flatMap((rule) =>
    [...rule.declarations]
      .filter(([name]) => name.toLowerCase() === property)
      .map(([name, value]) => ({
        selector: rule.selector,
        layer: rule.layer,
        name,
        value: String(value).replaceAll('!important', '').trim().toLowerCase(),
      })),
  );

/** The same, flattened to `[selector, value]` pairs so a failure names the rule. */
const pairsOf = (stylesheet, property) =>
  declarationsOf(stylesheet, property).map(({ selector, value }) => [selector, value]);

/** The whole `html` rule from `@layer base`, or null if it has gone. */
const rootRule = (stylesheet) => stylesheet.rules.find((rule) => rule.selector === 'html') ?? null;

/** A document root, so `ruleMatches` can prove the rule's selector reaches it. */
const rootContext = createContext({ types: ['html'] });

test('the sweep reaches the declarations html still carries', async () => {
  /*
   * A POSITIVE CONTROL, and the reason the two sweeps below can be believed. An
   * empty result from `selectorsDeclaring(stylesheet, [...])` looks exactly like a
   * walk that visited nothing, and the fix under test turns one of these properties
   * into precisely that empty-looking result. So the walk is pinned against the two
   * declarations the fix is REQUIRED to leave alone — the same two, on the same
   * rule, that the next test goes on to assert.
   *
   * Both live in `base` on the authored `html` rule, so the control also confirms
   * the compiled sheet's `base` layer is being read at all: a walk that stopped at
   * the layer boundary would find neither.
   */
  const stylesheet = parseCompiledStylesheet(await compiled);
  const smoothing = selectorsDeclaring(stylesheet, ['-webkit-font-smoothing']);
  const osxSmoothing = selectorsDeclaring(stylesheet, ['-moz-osx-font-smoothing']);

  expect(
    smoothing.map((rule) => [rule.selector, rule.declarations.get('-webkit-font-smoothing')]),
    'no compiled rule declares -webkit-font-smoothing, so the sweep is not reading anything',
  ).toEqual(expect.arrayContaining([['html', 'antialiased']]));
  expect(
    osxSmoothing.map((rule) => [rule.selector, rule.declarations.get('-moz-osx-font-smoothing')]),
    'no compiled rule declares -moz-osx-font-smoothing, so the sweep is not reading anything',
  ).toEqual(expect.arrayContaining([['html', 'grayscale']]));
  expect(smoothing.every((rule) => rule.layer === 'base')).toBe(true);
});

test('no compiled rule asks Blink for the full font-metrics text path', async () => {
  const stylesheet = parseCompiledStylesheet(await compiled);

  /*
   * The defect, named. Asserted over EVERY compiled rule rather than over `html`
   * alone: the cheap way to re-open this later is a `text-rendering` utility in a
   * template, a `:root` default or a nested rule, and narrowing the sweep to the
   * selector being edited would let all three through.
   *
   * The value is compared lowercased because lightningcss normalises it —
   * `optimizeLegibility` is spelled `optimizelegibility` by the time it reaches the
   * compiled sheet — and `!important` is stripped first so a future
   * `text-rendering: optimizeLegibility !important` cannot slip past on the keyword.
   */
  expect(
    pairsOf(stylesheet, 'text-rendering').filter(([, value]) => value === 'optimizelegibility'),
    'the compiled stylesheet declares text-rendering: optimizeLegibility',
  ).toEqual([]);

  /*
   * And the declaration is gone ENTIRELY, not restated. `text-rendering`'s initial
   * value is `auto`, which is precisely the cheap layout this fix is buying, so
   * leaving `html { text-rendering: auto }` behind as a harmless-looking spelling of
   * the removal would satisfy the assertion above and still leave a declaration on
   * the root that one later edit flips back. Absence is the only state that says what
   * it means, and it is the state the root's initial value already describes.
   */
  expect(pairsOf(stylesheet, 'text-rendering'), 'a rule still declares text-rendering').toEqual([]);
});

test('the only text-size-adjust left in the sheet is the one preflight ships', async () => {
  const stylesheet = parseCompiledStylesheet(await compiled);

  /*
   * The three spellings, swept as three names — see the header. Asserted as an exact
   * set rather than as an emptiness check because the honest post-fix state is NOT
   * empty: preflight's `html, :host` declaration survives, and the authored `html`
   * one is what the fix removes. A test written as `toEqual([])` would fail after the
   * fix for the right reason at the wrong value, and a test written to accept both
   * rules would pass before it. This is the assertion that separates them.
   */
  expect(pairsOf(stylesheet, '-webkit-text-size-adjust')).toEqual([[PREFLIGHT_ROOT, '100%']]);
  expect(pairsOf(stylesheet, '-moz-text-size-adjust')).toEqual([]);
  expect(pairsOf(stylesheet, 'text-size-adjust')).toEqual([]);

  /*
   * The survivor is pinned as the framework's, in the framework's layer, at the
   * framework's value. Two things depend on that specificity: the claim that the
   * authored `html` rule no longer duplicates preflight, and the claim that nobody has
   * "fixed" the duplication by moving it — editing the value, or re-homing it on the
   * authored `html` rule where it would once again be an author-owned declaration.
   */
  const [survivor] = declarationsOf(stylesheet, '-webkit-text-size-adjust');

  expect(survivor.layer, 'the surviving declaration is not in the base layer').toBe('base');
  expect(ruleMatches(survivor.selector, rootContext), 'preflight rule does not match html').toBe(
    true,
  );

  /*
   * And the AUTHORED `html` rule itself declares no text-size-adjust, in any of the
   * three spellings. The survivor above is a different rule with a different
   * selector, so this is what separates "the duplicate is gone" from "something still
   * sets it on `html` under the project's own name" — including a re-introduction
   * that used the unprefixed spelling, which the pair assertions above would already
   * have caught but which is worth naming at the rule it would have landed on.
   */
  const authored = rootRule(stylesheet);

  expect(
    [...(authored?.declarations.keys() ?? [])].filter((name) =>
      TEXT_SIZE_ADJUST.has(name.toLowerCase()),
    ),
    'the authored html rule still declares a text-size-adjust spelling',
  ).toEqual([]);
});

test('the html rule survives, and still sets everything it was there to set', async () => {
  const stylesheet = parseCompiledStylesheet(await compiled);
  const rule = rootRule(stylesheet);
  const declarations = rule?.declarations;

  /*
   * The fix removes two declarations from a rule, not the rule. `html` is where the
   * serif face, the paper and the ink are set for the whole book, so an empty or
   * missing root rule would take the page's typography with it while both sweeps
   * above stayed green — they assert absence and would not notice.
   */
  expect(rule, 'no rule for html in the compiled sheet').not.toBeNull();
  expect(rule.layer, 'the html rule is no longer in @layer base').toBe('base');
  expect(ruleMatches(rule.selector, rootContext), 'the html rule does not match html').toBe(true);

  expect(declarations.get('font-family')).toBe('var(--font-serif)');
  expect(declarations.get('background')).toBe('var(--paper)');
  expect(declarations.get('color')).toBe('var(--ink)');

  /*
   * The two paint-side smoothing declarations the fix deliberately KEEPS. They cost
   * a paint-time hint and no layout pass, and on a serif text book they are the
   * difference between thin strokes that stay visible on a light background and ones
   * that drop below the contrast threshold at body size — so their survival is an
   * assertion about legibility, not about the optimisation.
   */
  expect(declarations.get('-webkit-font-smoothing')).toBe('antialiased');
  expect(declarations.get('-moz-osx-font-smoothing')).toBe('grayscale');
});
