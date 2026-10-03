/*
 * The critical CSS, as the production build actually ships it.
 *
 * This is the one integration test that reads `dist/`, and the header comment on
 * `test/support/built-site.mjs` says why the rest of the suite does not. To restate
 * the part that matters here: the shape of the critical CSS is not visible in any
 * source file, so a source-level test for it would pass in both worlds.
 *
 * THE DEFECT. `build.inlineStylesheets: 'auto'` inlines a stylesheet only when it is
 * under the inline limit, which for Astro is `build.assetsInlineLimit` and defaults
 * to 4096 bytes. The global sheet compiles to 63,176 bytes — about fifteen times the
 * limit — so it stayed external, in `<head>`, on all thirty-eight pages, and became
 * the single largest first-paint blocker on the site: 306 ms of render-blocking time
 * on a Lighthouse mobile run.
 *
 * One misreading is worth recording, because it is the difference between a fix that
 * works and one that changes nothing. Astro reads `build.assetsInlineLimit`, its OWN
 * option. The `vite.build.assetsInlineLimit: 4096` line in this config governs whether
 * an ASSET — a font, a small image — becomes a data URI, and has no bearing whatever
 * on whether a stylesheet is inlined. So the number that was actually in force was
 * Astro's default, not the one written down in the comment above it.
 *
 * What is asserted, and why each one earns its place:
 *
 *   1. Nothing links a stylesheet from the head, and nothing on disk is the global
 *      sheet any more — so it was INLINED rather than duplicated alongside a link.
 *   2. Every page still carries the sheet's content. Inlining is a change of
 *      delivery, and the way to get it wrong is to inline something smaller than
 *      intended and leave a page that reads as unstyled.
 *   3. It lands inside `<head>`, not appended to the body. A stylesheet that arrives
 *      with the prose paints the page twice.
 *   4. Nothing carrying the global sheet is discovered late — with no exception. This
 *      assertion used to end at the global sheet and carry a documented carve-out for
 *      expressive-code's body link, and pinned that carve-out with a tripwire asserting
 *      the link was STILL THERE.
 *   5. A ceiling on the inlined bytes. Astro inlines with no size cap of its own, so
 *      this is the only bound in the pipeline.
 *
 * ON THE DELETED EXCEPTION IN (4), because a diff that only removes a test invites the reading that a
 * guard was quietly dropped. expressive-code emitted its own stylesheet as a `<link rel="stylesheet">`
 * written into the markdown AST, putting it inside `<body>` on thirty-four of the thirty-eight built
 * pages, 80.7% of the way into a representative document. It bypassed Astro's pipeline entirely, so no
 * setting in this config could move it, and the honest thing was to pin it. The tripwire existed so a
 * change that moved the link as a side effect would fail HERE rather than be credited in a later diff
 * review; its own comment said it was "the test to delete when expressive-code's sheet is hoisted".
 *
 * That happened, by a different route than the test's name anticipated: the sheet is not hoisted into
 * `<head>`, it is INLINED (`emitExternalStylesheet: false` in `astro.config.mjs`), so there is no link
 * left to be late. The tripwire had nothing left to assert — its first line required the defect to
 * still exist — and is deleted rather than inverted, because the invariant it protected is now asserted
 * at full strength by the test above it and, for the wider claim, by
 * `test/integration/code-block-css.test.mjs`. Nothing about the global sheet's own behaviour changed.
 * What changed is the scope of this file's claims, and it now makes them without a carve-out.
 */
import { beforeAll, expect, test } from 'vitest';
import {
  afterHead,
  buildIsCurrent,
  carriesGlobalSheet,
  emittedSheet,
  ensureBuild,
  inHead,
  inlineStyleBlocks,
  loadBuiltPages,
  loadEmittedStylesheets,
  stylesheetLinks,
  hrefOf,
} from '../support/built-site.mjs';

/**
 * Three markers that only the global sheet can produce.
 *
 * `.running-head` and `.disclosure-flow` are `@utility` rules in
 * `src/styles/global.css`, so each is emitted only because a template or a content
 * file uses it, and `--paper` is a theme custom property. None of the three is
 * reachable from a component `<style>` block — there are none in this project — and
 * none of them occurs in the prose, so a match in a built page means the global sheet
 * is in that page rather than that the word happens to appear somewhere in it.
 */
const GLOBAL_MARKERS = ['.running-head', '--paper', '.disclosure-flow'];

/**
 * The ceiling on inlined CSS bytes per page, and the arithmetic is the point.
 *
 * After the fix a page carries roughly 63 KB of global sheet, roughly 19 KB of Astro's
 * own inlined styles — the `@font-face` blocks and the view-transition layer — and, on
 * the thirty-four pages that have a code block, expressive-code's 15.8 KB. A real page
 * sits near 98 KB and this bound leaves about 1.3x headroom: room for a chapter to grow,
 * and none for a second copy. A duplicated global sheet would put a page near 145 KB and
 * fail, which is the regression this is actually watching for. Measured after expressive-
 * code's sheet joined the page, the range across the thirty-eight built pages is 89-98 KB;
 * the four code-free pages sit at the bottom of it, which is the same four pages
 * `code-block-css.test.mjs` asserts carry none of expressive-code's rules.
 *
 * The bound itself is unchanged from when it was written against a 73-83 KB range, and
 * that is deliberate rather than lucky: 128 KiB was chosen as a multiple of the global
 * sheet, not as a function of the current total, so a second stylesheet arriving did not
 * require re-tuning it. Had it been a round number above the measurement instead, this
 * commit would have had to raise it — and a ceiling that has to move every time the site
 * grows is a ceiling that stops being a check.
 *
 * It is deliberately generous in the other direction too. This is not a byte budget
 * for the stylesheet; it is a bound on the size of the thing being inlined, so that an
 * unminified build or a duplicated sheet is caught by a number rather than by a
 * reader noticing the HTML got heavy.
 */
const INLINE_CSS_CEILING = 128 * 1024;

const byteLength = (text) => Buffer.byteLength(text, 'utf8');
const inlinedBytes = (html) =>
  inlineStyleBlocks(html).reduce((total, block) => total + byteLength(block.body), 0);

let pages = [];
let stylesheets = new Map();
let buildOrigin = '';

beforeAll(async () => {
  buildOrigin = await ensureBuild();
  [pages, stylesheets] = await Promise.all([loadBuiltPages(), loadEmittedStylesheets()]);
}, 180_000);

test('every built page is readable, and this is the build they were read from', async () => {
  /*
   * The vacuity guard, and it comes first because every assertion below iterates
   * `pages`. An empty list passes all of them, and an empty list is exactly what a
   * missing `dist/` produces — which is the failure this repository cares about
   * most: a check that goes silent in the configuration a fresh clone is in.
   */
  expect(pages.length, 'the built site has no pages to check').toBeGreaterThan(30);

  /*
   * And the build is named, so a reader of a red test knows whether they are looking at the current sources
   * or at something left over on disk; the assertion below stops the second case. All THREE of the sentences
   * `ensureBuild` can resolve to are named, not two: "waited for another test file to build" means the lock
   * was held already (`built-site.mjs:160`), which is correct rather than a failure.
   */
  expect(buildOrigin, 'the build was never resolved').toMatch(
    /^built dist\/|^reused the build|^waited for another test file/u,
  );
  expect(await buildIsCurrent(), 'the build on disk predates the config that shaped it').toBe(true);
});

test('no page links a stylesheet from its head', () => {
  /*
   * The fix, stated as the smallest true thing: after inlining, the head carries no
   * stylesheet link on any page. A `<link rel="stylesheet">` in the head is a
   * render-blocking request by definition, so this is the one assertion whose failure
   * names the 306 ms directly.
   *
   * It counts rather than matching a filename, on purpose. The sheet was misleadingly
   * emitted as `SiteFooter.*.css` even though no component owns any of it, so pinning
   * that name would assert a lie — and it would break the day the chunk hash changed.
   */
  const linked = pages.flatMap(({ file, html }) =>
    stylesheetLinks(inHead(html)).map((tag) => `${file} → ${hrefOf(tag)}`),
  );

  expect(linked).toEqual([]);
});

test('no stylesheet left on disk is the global sheet any more', () => {
  /*
   * Inlined, not duplicated.
   *
   * The assertion below is satisfied just as well by a `<style>` holding a token
   * handful of the sheet plus a `<link>` to all of it, so this closes the other
   * half: the three markers never appear TOGETHER in any file the build emitted.
   * Astro deletes an inlined asset from the bundle, so if this fails the sheet is
   * still on disk and something is being fetched as well as inlined.
   *
   * The guard used to be `expect(stylesheets.size).toBeGreaterThan(0)`, on the reasoning that an empty
   * sweep proves nothing. That was sound while expressive-code emitted `_astro/ec.*.css`, and stopped
   * being true when its sheet was inlined too: this build now emits NO stylesheet files at all, and the
   * correct value of this count became zero. Asserting it positive would have gone red on a build more
   * correct than the one it was written for.
   *
   * So the guard is a POSITIVE CONTROL rather than a non-empty list: the markers are asserted to be
   * findable, inline, on a page. That establishes they are discriminable — a sheet carrying all three
   * would be caught, and the sweep is known to work because the same markers were just located in the
   * markup. A vacuous sweep and a working one are distinguishable, which is all the old assertion was
   * trying to establish.
   */
  const inlineCarrier = pages.find(({ html }) =>
    inlineStyleBlocks(html).some((b) => carriesGlobalSheet(b.body, GLOBAL_MARKERS)),
  );
  expect(
    inlineCarrier,
    'no built page inlines the global sheet, so a sweep of the emitted files cannot be trusted',
  ).toBeDefined();

  const carriers = [...stylesheets.values()].filter((css) =>
    carriesGlobalSheet(css, GLOBAL_MARKERS),
  );
  expect(carriers).toEqual([]);
});

test('every page carries the global sheet inline', () => {
  /*
   * Inlining is a change of DELIVERY, and the way to get it wrong is to inline
   * something smaller than intended — a tree-shaken fragment, or the authored rules
   * without the Tailwind layer — and leave a page that reads as unstyled. So this is
   * not satisfied by "a `<style>` exists". It is satisfied by all three markers, on
   * every page, which together mean the whole sheet arrived rather than a part of it.
   *
   * Asserted as a boolean rather than `toContain`, and that is deliberate on the
   * failure side: a 92 KB page makes vitest print the entire document as the diff,
   * which buries the one line that says what is wrong under a screenful of prose.
   */
  for (const { file, html } of pages) {
    for (const marker of GLOBAL_MARKERS) {
      expect(html.includes(marker), `${file} does not carry "${marker}" inline`).toBe(true);
    }
  }
});

test('the inlined sheet is inside the head, not appended to the body', () => {
  /*
   * Placement, not membership.
   *
   * Every assertion above is satisfiable by a `<style>` anywhere in the document, and
   * a stylesheet that arrives with the prose paints the page twice: once unstyled,
   * once styled. The browser is holding the document by the time it parses the body,
   * so a body stylesheet is strictly later than a head one and strictly worse.
   *
   * The block is found by its own markers rather than by position, so this cannot
   * pass on some unrelated `<style>` that happens to sit early in the page.
   */
  for (const { file, html } of pages) {
    const critical = inlineStyleBlocks(html).find((block) =>
      GLOBAL_MARKERS.every((marker) => block.body.includes(marker)),
    );

    expect(
      critical,
      `${file} has no single <style> element holding the global sheet`,
    ).toBeDefined();
    expect(critical.at, `${file} inlines the global sheet after the head closed`).toBeLessThan(
      html.indexOf('</head>'),
    );
  }
});

test('the global sheet is never discovered after the head', () => {
  /*
   * The invariant THIS commit is about, held to the sheets this commit is about.
   *
   * The defect fixed here was a stylesheet in `<head>` that blocks first paint. A
   * different defect was open alongside it — a stylesheet link emitted into the body,
   * where a scanner meets it hundreds of kilobytes into the document — and it is
   * CLOSED now, by `emitExternalStylesheet: false` in `astro.config.mjs`.
   *
   * So the exception this test used to carry is gone, and the rule is stated at full
   * strength: nothing carrying the global sheet's markers is ever linked from after
   * `</head>`, on any page. The wider claim — that no stylesheet link at all appears
   * after `</head>`, expressive-code's included — lives in
   * `test/integration/code-block-css.test.mjs`, which is where a code-block regression
   * should fail. What is left here is the global sheet's own version of it, unchanged
   * in meaning and now stricter in reach.
   */
  const lateCarriers = pages.flatMap(({ file, html }) =>
    stylesheetLinks(afterHead(html))
      .filter((tag) => carriesGlobalSheet(emittedSheet(stylesheets, tag), GLOBAL_MARKERS))
      .map((tag) => `${file} → ${hrefOf(tag)}`),
  );

  expect(lateCarriers).toEqual([]);
});

test('nothing is fetched for CSS, and what was inlined is under the ceiling', () => {
  /*
   * Two budgets in one test because they are one budget seen from two sides: nothing
   * is fetched for CSS, and what was inlined is bounded.
   *
   * The external count is exact rather than a ceiling. After this fix the answer is
   * zero, and a bound that permitted one external sheet would permit the exact
   * regression the commit exists to remove — a ceiling on a quantity whose correct
   * value is zero is a loophole, not a check.
   */
  const externalFromHead = pages.reduce(
    (total, { html }) => total + stylesheetLinks(inHead(html)).length,
    0,
  );
  expect(externalFromHead).toBe(0);

  /*
   * And the ceiling — `INLINE_CSS_CEILING`, whose arithmetic is documented on the
   * constant. The measured range is 73-83 KB against a 128 KiB bound; a second copy
   * of the sheet would put a page near 145 KB, which fails.
   */
  for (const { file, html } of pages) {
    const inlined = inlinedBytes(html);

    expect(
      inlined,
      `${file} inlines ${(inlined / 1024).toFixed(1)} KiB of CSS, over the ${
        INLINE_CSS_CEILING / 1024
      } KiB ceiling`,
    ).toBeLessThanOrEqual(INLINE_CSS_CEILING);
  }
});
