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
 *   4. Nothing carrying the global sheet is discovered late — with one deliberate,
 *      documented exception for the sheet expressive-code still writes itself.
 *   5. A ceiling on the inlined bytes. Astro inlines with no size cap of its own, so
 *      this is the only bound in the pipeline.
 *
 * The exception in (4) is the honest part. Thirty-four of the thirty-eight built pages
 * still carry a stylesheet link emitted into the BODY, hundreds of kilobytes into the
 * document. expressive-code writes that link itself, into the markdown AST, through
 * its own bundler; it never passes through Astro's stylesheet pipeline, so no setting
 * in this config can move it. It is a separate defect with a separate fix, and this
 * commit does not make it — so the test says exactly how far the invariant reaches
 * and pins the remainder instead of pretending it is not there.
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
 * After the fix a page carries roughly 63 KB of global sheet plus roughly 19 KB of
 * Astro's own inlined styles — the `@font-face` blocks and the view-transition layer
 * — so a real page sits near 82 KB and this bound leaves about 1.6x headroom: room
 * for a chapter to grow, and none for a second copy. A duplicated global sheet would
 * put a page near 145 KB and fail, which is the regression this is actually watching
 * for. Measured, the range across the thirty-eight built pages is 73-83 KB.
 *
 * It is deliberately generous in the other direction too. This is not a byte budget
 * for the stylesheet; it is a bound on the size of the thing being inlined, so that an
 * unminified build or a duplicated sheet is caught by a number rather than by a
 * reader noticing the HTML got heavy.
 */
const INLINE_CSS_CEILING = 128 * 1024;

/** The container expressive-code writes around every rendered code block. */
const CODE_BLOCK_FRAME = '<figure class="frame"';

const byteLength = (text) => Buffer.byteLength(text, 'utf8');
const inlinedBytes = (html) =>
  inlineStyleBlocks(html).reduce((total, block) => total + byteLength(block.body), 0);
const isLateStylesheet = (html) => stylesheetLinks(afterHead(html)).length > 0;

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
   * And the build is named, so a reader of a red test knows whether they are
   * looking at the current sources or at something left over on disk. The freshness
   * assertion is what stops the second case: `ensureBuild` only reuses a `dist/`
   * that is at least as new as the files that shaped it.
   */
  expect(buildOrigin, 'the build was never resolved').toMatch(/^built dist\/|^reused the build/u);
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
   * The assertion above is satisfied just as well by a `<style>` holding a token
   * handful of the sheet plus a `<link>` to all of it, so this closes the other
   * half: the three markers never appear TOGETHER in any file the build emitted.
   * Astro deletes an inlined asset from the bundle, so if this fails the sheet is
   * still on disk and something is being fetched as well as inlined.
   *
   * The guard is what keeps the sweep from passing on an empty list, which is what a
   * renamed assets directory would produce.
   */
  expect(stylesheets.size, 'the build emitted no stylesheet files at all').toBeGreaterThan(0);

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
   * The defect fixed here is a stylesheet in `<head>` that blocks first paint. The
   * defect still open is a different one: a stylesheet link emitted into the body,
   * where a scanner meets it hundreds of kilobytes into the document.
   * expressive-code writes that link itself, into the markdown AST, through its own
   * bundler — it never passes through Astro's stylesheet pipeline, so no setting in
   * this config can move it. It gets its own commit.
   *
   * So the rule is stated as far as the fix reaches: nothing carrying the global
   * sheet's markers is ever linked from after `</head>`, on any page.
   */
  const lateCarriers = pages.flatMap(({ file, html }) =>
    stylesheetLinks(afterHead(html))
      .filter((tag) => carriesGlobalSheet(emittedSheet(stylesheets, tag), GLOBAL_MARKERS))
      .map((tag) => `${file} → ${hrefOf(tag)}`),
  );

  expect(lateCarriers).toEqual([]);
});

test("the remainder that is still late is expressive-code's own link, and only its own", () => {
  /*
   * What is left over, pinned rather than pretended away — and the test to delete
   * when expressive-code's sheet is hoisted.
   *
   * The first assertion is the tripwire, and it is the reason this is a separate
   * test rather than a comment. It asserts that the remainder is STILL THERE and
   * STILL LATE. If a change to this config ever moved expressive-code's link into
   * the head as well — which no setting here should be able to do, but which is
   * exactly the kind of thing that happens when an integration's injection point
   * moves — then this test stops being a scoped statement about an open defect and
   * becomes a false claim about a fixed one, and it fails here rather than in the
   * diff review of a later commit.
   *
   * The second assertion holds the remainder to what it is supposed to be: a body
   * link on a page that has a code block to style, and on no other page. Both
   * directions are asserted, because a body link on a page with no code would be a
   * link with no reason to exist. Thirty-four of the thirty-eight built pages carry a
   * code block and a body link; the four that do not — the home page, the 404, and
   * two code-free pages — carry neither.
   */
  const late = pages.filter(({ html }) => isLateStylesheet(html));
  expect(late.length, 'expressive-code no longer emits a body stylesheet link').toBeGreaterThan(0);

  for (const { file, html } of pages) {
    expect(
      isLateStylesheet(html),
      `${file} has a body stylesheet link but no rendered code block`,
    ).toBe(html.includes(CODE_BLOCK_FRAME));
  }
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
