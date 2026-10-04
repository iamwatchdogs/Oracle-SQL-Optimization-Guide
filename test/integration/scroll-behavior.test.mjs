/**
 * In-page navigation must be INSTANT, and this file is the guard that says so.
 *
 * THE DEFECT. `src/styles/global.css:784` declared `scroll-behavior: smooth` on
 * `html`. Every one of the 38 links in the reading outline (`ReadingToc.astro`) is
 * an in-page anchor (`href="#id"`), and `<ClientRouter />` answers a click on one
 * with `location.href = to.href` — the same-document half of
 * `moveToLocation` in `node_modules/astro/dist/transitions/router.js` — which is a
 * fragment navigation the BROWSER scrolls for. With `smooth` on the root that
 * becomes an animation of a length the page does not choose, and the reading
 * scroll-spy re-measured every heading on every frame of it: 50-80 frames of forced
 * layout for one click, and the root of a 250 ms INP.
 *
 * WHY THIS ASSERTS ON THE COMPILED SHEET. The declaration being removed sits in
 * `@layer base`, Tailwind's utilities land in `utilities`, and the reduced-motion
 * override is unlayered with `!important`. A source regex sees none of that: it
 * would miss a `scroll-smooth` utility reintroduced through a template, it would
 * match the word inside a comment, and it would miss a nested at-rule. So this
 * compiles `src/styles/global.css` through the project's own Vite + Tailwind
 * pipeline (`compileProjectStylesheet()`) and walks the RESULT — the approach
 * `prose-cascade.test.mjs` and `disclosure-css.test.mjs` already use, and for the
 * same reason.
 *
 * WHAT IS DELIBERATELY NOT HERE. Whether an anchor click actually LANDS without an
 * animation is a runtime property of the browser, so it lives in
 * `test/e2e/scroll-behavior.spec.mjs`. And parking the scroll-spy on `scrollend`
 * is a separate change with its own guard in
 * `test/unit/reading-toc-scroll-cost.test.mjs`; this file says nothing about it.
 */
import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import {
  parseCompiledStylesheet,
  selectorsDeclaring,
} from '../../test/support/css/css-cascade.mjs';
import { compileProjectStylesheet } from '../../test/support/css/tailwind-compile.mjs';

const GLOBAL_CSS = '../../src/styles/global.css';

const compiled = compileProjectStylesheet();

/**
 * `!important` is part of a declaration's value, so it comes off before the keyword
 * is compared. Without this, a future `scroll-behavior: smooth !important` would
 * slip past a `=== 'smooth'` check and re-open the defect with extra reach.
 */
const keywordOf = (raw) =>
  String(raw ?? '')
    .replaceAll('!important', '')
    .trim()
    .toLowerCase();

/**
 * Every `scroll-behavior` declaration in the compiled sheet, flattened to one entry
 * per comma-separated selector so a failure names the selector that is at fault
 * rather than printing a six-item list.
 */
const scrollBehaviorDeclarations = async () => {
  const stylesheet = parseCompiledStylesheet(await compiled);
  return selectorsDeclaring(stylesheet, ['scroll-behavior']).flatMap((rule) =>
    rule.selector.split(',').map((selector) => ({
      selector: selector.trim(),
      layer: rule.layer,
      keyword: keywordOf(rule.declarations.get('scroll-behavior')),
    })),
  );
};

/*
 * Offset of the `}` that closes the block whose `{` follows `opener`, or -1 if it
 * never closes. Depth starts at 1 from that brace rather than at `opener`: `opener`
 * is the offset of an AT-RULE keyword, where the depth is still zero, so counting
 * from it would report the block closed at the very character it opened on.
 */
const blockEnd = (css, opener) => {
  const opening = css.indexOf('{', opener);
  let depth = 1;
  for (let cursor = opening + 1; cursor < css.length; cursor += 1) {
    depth += css[cursor] === '{' ? 1 : css[cursor] === '}' ? -1 : 0;
    if (depth === 0) {
      return cursor;
    }
  }
  return -1;
};

test('the sweep below is looking at a real, parsed stylesheet', async () => {
  /*
   * A POSITIVE CONTROL, and the reason the next test can be believed. An empty
   * result from `selectorsDeclaring(stylesheet, ['scroll-behavior'])` looks exactly
   * like a walk that visited nothing, and the fix under test produces precisely
   * that empty-looking result on one selector. So the walk is proven against a
   * property that is certainly present.
   *
   * `scroll-margin-top` is the right one to prove it with rather than an arbitrary
   * token, because `:target, [id]` is the offset
   * `test/e2e/scroll-behavior.spec.mjs` computes its expected landing position from.
   * If this value ever moved, that spec's arithmetic would move with it and report
   * green — so pinning it here is what keeps the e2e half of this change honest.
   */
  const margins = selectorsDeclaring(parseCompiledStylesheet(await compiled), [
    'scroll-margin-top',
  ]);

  expect(
    margins.map((rule) => [rule.selector, rule.declarations.get('scroll-margin-top')]),
  ).toEqual(expect.arrayContaining([[':target, [id]', '5.5rem']]));
});

test('no compiled rule asks the browser to smooth-scroll anything', async () => {
  /*
   * The fix, and it is deliberately stated over EVERY declaration rather than over
   * `html` alone. The claim being restored is "no rule in the shipped sheet asks
   * for a smooth scroll", and the cheap way to break that claim later is to add it
   * somewhere else: a `scroll-smooth` utility in a template, a `:root` default, a
   * nested rule under a component. Narrowing the assertion to the selector being
   * edited would let all three through.
   */
  const declarations = await scrollBehaviorDeclarations();

  expect(
    declarations.filter((entry) => entry.keyword === 'smooth'),
    'the compiled stylesheet declares scroll-behavior: smooth',
  ).toEqual([]);
});

test('the viewport scrolling element declares no scroll-behavior of its own', async () => {
  /*
   * The same absence, pinned to the two selectors that decide how the ROOT scrolls,
   * and this time `auto` counts against it too.
   *
   * `scroll-behavior` is not inherited, so nothing downstream can be rescued by a
   * child declaring the opposite: whatever the root element resolves to IS what a
   * fragment navigation does. Leaving `html { scroll-behavior: auto }` behind as a
   * "harmless" spelling of the fix would satisfy the test above and still be a
   * declaration on the root that a later edit could flip back — so the root is held
   * to declaring nothing at all and falling back to the initial `auto`.
   *
   * `*` is intentionally absent from this list. The reduced-motion block declares
   * `scroll-behavior: auto !important` on `*`, `::before`, `::after`, `::backdrop`,
   * `::marker` and `details::details-content`, and that declaration has to stay
   * exempt from this check or the two files contradict each other.
   */
  const onRoot = await scrollBehaviorDeclarations();

  expect(
    onRoot.filter((entry) => entry.selector === 'html' || entry.selector === ':root'),
    'the root element still declares scroll-behavior',
  ).toEqual([]);
});

test('the reduced-motion block still zeroes transitions and animations', async () => {
  /*
   * Unrelated to the scroll change, and required to survive it.
   *
   * Comments come off first so the brace walk cannot be thrown by a brace inside
   * one — the reduced-motion block carries an explanatory comment in the middle of
   * its selector list. With the comments gone the block is real CSS or nothing,
   * which is also the right thing for an assertion about declarations to read.
   */
  const css = (await readFile(new URL(GLOBAL_CSS, import.meta.url), 'utf8')).replaceAll(
    /\/\*[\s\S]*?\*\//gu,
    '',
  );
  const opener = css.indexOf('@media (prefers-reduced-motion: reduce)');

  expect(opener, 'src/styles/global.css declares no prefers-reduced-motion block').toBeGreaterThan(
    -1,
  );
  const end = blockEnd(css, opener);
  expect(end, 'the prefers-reduced-motion block never closes').toBeGreaterThan(opener);

  const block = css.slice(opener, end);

  expect(block).toContain('transition: none !important');
  expect(block).toContain('animation: none !important');
  /*
   * Both declarations are on the FIRST rule of the block, so they only mean
   * anything if that rule's selector list still contains `*`. Asserting the
   * declarations alone would stay green through the deletion of `*` from the list,
   * which is the edit that would quietly hand 280ms of motion back to the readers
   * who asked for none.
   *
   * The list is read between the at-rule's `{` and the NEXT one — the at-rule opens
   * with a brace of its own, and slicing to the first brace would yield the media
   * condition rather than the selector.
   */
  const atRuleOpen = css.indexOf('{', opener);
  const firstRuleList = css.slice(atRuleOpen + 1, css.indexOf('{', atRuleOpen + 1));

  expect(firstRuleList.split(',').map((entry) => entry.trim())).toContain('*');
});

/*
 * OPEN QUESTION, CONFIRM BEFORE THE `scroll-behavior: smooth` REMOVAL IS MERGED.
 *
 * That block ALSO declares `scroll-behavior: auto !important`, on the selector list
 * above. Nothing here asserts it either way, on purpose, because the decision is
 * still open. What the sweep says:
 *
 *   - `*` matches `html`, and `!important` outranks the unlayered-vs-`base` question
 *     entirely, so THIS line is what a `prefers-reduced-motion: reduce` reader is
 *     getting instant scrolling from today. It is load-bearing RIGHT NOW.
 *   - After the removal, nothing in this repository sets `scroll-behavior` at all —
 *     `src/styles/global.css:784` is the only declaration, no template uses
 *     Tailwind's `scroll-smooth`/`scroll-auto`, and neither `astro` nor
 *     `astro-expressive-code` emits the property — so the line becomes INERT
 *     rather than wrong. It keeps working as a floor if smooth scrolling is ever
 *     reintroduced, and as a neutraliser for any scroll container a future component
 *     adds, since `scroll-behavior` is not inherited and `*` is what covers those.
 *
 * DESIGN.md:320 documents the block as forcing `scroll-behavior: auto`, so removing
 * the line is a documentation edit too, not only a CSS one.
 */
