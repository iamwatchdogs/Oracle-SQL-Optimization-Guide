/*
 * Which self-hosted faces go on the critical path, as the production build ships them.
 *
 * A sibling of `render-blocking-css.test.mjs` and `code-block-css.test.mjs`, and it reads `dist/` for the
 * reason `test/support/built-site.mjs` gives in its header: which faces a browser is told to fetch before it
 * has read the page is not a property of any source file. `<Font>` is one line per family in
 * `src/layouts/BaseLayout.astro`, and the difference between the italic face being on that list and off it
 * is 20,380 bytes the parser is handed before the document exists.
 *
 * THE DEFECT, in two halves, both measured on this build rather than argued.
 *
 * One: `<Font cssVariable="--face-serif" preload />` emitted a preload for BOTH files of the family,
 * because the family is configured `styles: ['normal', 'italic']` (`astro.config.mjs`) and `preload` was the
 * bare boolean `true`. `filterPreloads` returns `data` unchanged when `preload === true`
 * (`node_modules/astro/dist/assets/fonts/core/filter-preloads.js:5-7`), so one prop became two `<link>` tags,
 * one of them the italic face. Not a duplication bug — that is the documented behaviour of the boolean, and
 * also the only reason the prop's per-style form matters.
 *
 * Two: JetBrains Mono was the one face with no preload, and it is the face the running head renders in — the
 * wordmark and the `Section 02 / 09` counter (`BaseLayout.astro:317-322`, `:428-435`), inside a `sticky top-0`
 * header that is on screen on every page. c7a3785 added the sans preload for exactly this reason and
 * recorded the measurement — Lighthouse home 90→92, FCP −300 ms — so this change continues that reasoning
 * rather than reversing it.
 *
 * THE PER-STYLE MECHANISM, the easy part to get wrong: `preload` is not a boolean. `FontPreloadFilter` is
 * `boolean | Array<{ weight?, style?, subset? }>` (`astro/dist/assets/fonts/types.d.ts`), the component
 * types its prop that way (`node_modules/astro/components/Font.astro:10`), and `filterPreloads` matches the
 * array entry-by-entry (`filter-preloads.js:8-21`). It is evaluated per render (`Font.astro:22`), which is
 * why it works from a single layout file.
 *
 * This file is about WHAT THE HEAD ASKS THE PARSER TO FETCH. Whether each of those faces is one a reader
 * sees above the fold is `font-above-fold.test.mjs`, and the browser half of both is
 * `test/e2e/font-preload.spec.mjs`.
 *
 * ELSEWHERE: the fix, the rejected alternatives and their measurements are in the `<Font>` comment in
 * `BaseLayout.astro`. The cascade that decides which face an element paints in, and "above the fold" as this
 * repository defines it without a browser, are in `test/support/css/font-faces.mjs`.
 */
import path from 'node:path';
import { beforeAll, expect, test } from 'vitest';
import {
  afterHead,
  buildIsCurrent,
  ensureBuild,
  hrefOf,
  loadBuiltPages,
} from '../support/built-site.mjs';
import { fontFilesByFace } from '../support/css/font-faces.mjs';
import {
  facePreloadFiles,
  fontFaceRules,
  fontPreloadLinks,
  loadEmittedFonts,
} from '../support/fonts.mjs';

/** A built asset URL reduced to its file name, which is how both the inventory and every link key it. */
const nameOf = (url) => path.posix.basename(url);

/**
 * The intended mapping, one row per decision, keyed by `(face, style)` rather than by file name.
 *
 * A file name is a hash of the font's bytes and changes on every font bump, so a test that pinned it
 * would go red on a dependency update and teach the next reader to update it. Each face is resolved
 * through the page's own `@font-face` rules, so "the serif face, upright" finds whatever bytes the
 * provider shipped this build.
 */
const INTENDED_PRELOAD = {
  /* The `<h1>` on all 37 pages, and the largest contentful paint on 69 of 74 page-and-viewport pairs. */
  'serif|normal': true,
  /* Every visible control in the running head, on all 37 pages. Kept on c7a3785's reasoning. */
  'sans|normal': true,
  /* The header wordmark and the section counter, on all 37 pages. Was `false`; should have been `true`. */
  'mono|normal': true,
  /* Nothing in the head region on any page. The largest file of the four, at 51,720 bytes. */
  'serif|italic': false,
};

/**
 * The ceiling on bytes the `<head>` hands to the parser as font preloads.
 *
 * The three intended faces measure 130,724 bytes on this build (50,952 upright serif + 48,432 sans +
 * 31,340 mono), 0.91× this bound. Adding the italic face puts the parser at 151,104, 1.05×, which fails —
 * so the bound separates the intended list from every list one file longer, the only way it can fail.
 *
 * Not a font budget: every one of these files is transferred on every page regardless. What this bounds is
 * the group the PARSER resolves before the document has any content, the only part of the font cost a
 * reader waits on.
 */
const PRELOAD_CEILING = 140 * 1024;

/** Whether the build preloads the file serving one face, as a label a diff can be read against. */
const state = (fileOf, preloaded, key) =>
  preloaded.has(fileOf.get(key)) ? 'preloaded' : 'not preloaded';

/**
 * One entry per page: which file serves each `(face, style)` this build declares.
 *
 * The join, not the cascade. Only `font-above-fold.test.mjs` needs to know which face an element PAINTS IN,
 * and that is the expensive half — a document parse plus a selector match per element, about twelve seconds
 * over the thirty-eight pages. Reading which bytes a decision is about is a regex pass over the inlined CSS.
 * `files` lines up with `pages` by index, which is safe because both come from the same `loadBuiltPages()`
 * result in the same array.
 */
let pages = [];
let files = [];
let fonts = new Map();
let buildOrigin = '';

beforeAll(async () => {
  buildOrigin = await ensureBuild();
  [pages, fonts] = await Promise.all([loadBuiltPages(), loadEmittedFonts()]);
  files = pages.map(({ html }) => fontFilesByFace(html));
}, 180_000);

test('every built page is readable, and this is the build they were read from', async () => {
  /*
   * The vacuity guard, first because every assertion below iterates `pages`. An empty list passes all of
   * them, and an empty list is what a missing `dist/` produces — a check going silent in the configuration
   * a fresh clone is in. The build is named so a reader of a red test knows what they are looking at, and
   * the font inventory is counted for the same reason: a sweep that found nothing would agree with a
   * correct answer.
   */
  expect(pages.length, 'the built site has no pages to check').toBeGreaterThan(30);
  expect(buildOrigin, 'the build was never resolved').toMatch(
    /^built dist\/|^reused the build|^waited for another test file/u,
  );
  expect(await buildIsCurrent(), 'the build on disk predates the config that shaped it').toBe(true);
  expect(fonts.size, 'the build emitted no self-hosted font file to preload').toBe(4);
});

test('every face is declared with font-display: swap, and every declaration names a real file', () => {
  /*
   * The property that makes a preload optional rather than mandatory, and the reason the whole trade-off
   * here is a trade-off. All 24 rules on this build — 12 self-hosted faces across three weights each, plus
   * Astro's 12 metric-adjusted LOCAL fallbacks — carry `font-display: swap`.
   *
   * `optional` was considered and rejected: it would make an unpreloaded face disappear permanently after
   * its short block period, so the 30 pages that render no italic in the first viewport would never see
   * the italic face at all rather than seeing it a moment late. `swap` makes the cost of dropping a preload
   * a reflow the reader may or may not notice. So the assertion is on `swap` exactly, not on "some value":
   * `block` would reintroduce FOIT on every face and is worth knowing about.
   */
  for (const { file, html } of pages) {
    const rules = fontFaceRules(html);
    const selfHosted = rules.filter((rule) => rule.src !== '');

    expect(
      rules.length - selfHosted.length,
      `${file} declares no metric-adjusted local fallback`,
    ).toBe(12);
    for (const rule of rules) {
      expect(
        rule.display,
        `${file} declares "${rule.family}" ${rule.style} without font-display: swap`,
      ).toBe('swap');
      if (rule.src !== '') {
        expect(
          fonts.has(nameOf(rule.src)),
          `${file} declares ${rule.style} ${rule.family} at ${rule.src}, which was not emitted`,
        ).toBe(true);
      }
    }
  }
});

test('no preload link is malformed, duplicated, or outside the head', () => {
  /*
   * The duplication and ordering question, asked of the artifact rather than answered from the component's
   * source. Three things can go wrong with a generated preload list and only one of them is a byte count:
   * Astro emitting the links twice (`<Font>` renders one `<link>` per entry in the FILTERED list,
   * `Font.astro:27-31`, so this would mean the virtual module registered a family twice); a link pointing
   * at a file no longer in `dist/`, which is a 404 on the critical path; and a missing `crossorigin`.
   *
   * That last one is the attribute whose absence is invisible in the markup and DOUBLES the transfer:
   * fonts are always fetched in CORS mode, so a preload without it is fetched once by the preload and again
   * by the `@font-face`, and the second copy arrives after layout. Asserted per tag rather than assumed
   * from `<Font>` doing the right thing. `type` is asserted too — the one attribute on the tag that is
   * documentation rather than behaviour, and a wrong value is a silent lie to anything reading the preload
   * list to decide what to fetch early.
   */
  for (const { file, html } of pages) {
    const tags = fontPreloadLinks(html);

    for (const tag of tags) {
      const target = hrefOf(tag);
      expect(
        /\bcrossorigin\b/u.test(tag),
        `${file} preloads ${target} without crossorigin, so it is fetched twice`,
      ).toBe(true);
      expect(/\btype="font\/woff2"/u.test(tag), `${file} preloads ${target} with no type`).toBe(
        true,
      );
      expect(
        fonts.has(nameOf(target)),
        `${file} preloads ${target}, which the build did not emit`,
      ).toBe(true);
    }

    /*
     * Exact rather than a bound, and over the whole document rather than the head: a second link for a face
     * the parser is not told about would be a second copy of the same bytes on the critical path, which no
     * count of "how many faces" would catch.
     */
    const targets = tags.map((tag) => nameOf(hrefOf(tag)));
    expect(new Set(targets).size, `${file} preloads the same file twice`).toBe(targets.length);
    expect(fontPreloadLinks(afterHead(html)), `${file} preloads a font after </head>`).toEqual([]);
  }
});

test('the mapping is the four faces decided one row at a time, and it costs less than the ceiling', () => {
  /*
   * The whole claim as the table at the top of this file, because the mapping and its cost are one
   * decision and the mapping alone cannot see bytes. Together these two also bound the mapping from
   * outside: a future `<Font preload={{ style: 'italic' }}>` on a face the head region does use would leave
   * every subset assertion green and only the ceiling would catch it.
   *
   * Identical on every page, and that is an assertion rather than an assumption: the three `<Font>` tags are
   * rendered unconditionally, so a future page passing a conditional filter would make the list vary per
   * route while every per-page assertion above still passed. That would not be wrong on its own — it would
   * be a different design — but `INTENDED_PRELOAD` has one answer, and this is where a page that disagreed
   * with it goes red.
   */
  for (const [index, { file, html }] of pages.entries()) {
    const fileOf = files[index];
    const preloaded = facePreloadFiles(html);

    expect(
      Object.fromEntries(
        Object.keys(INTENDED_PRELOAD).map((key) => [
          fileOf.get(key),
          state(fileOf, preloaded, key),
        ]),
      ),
      `${file} preloads a different set of faces`,
    ).toEqual(
      Object.fromEntries(
        Object.entries(INTENDED_PRELOAD).map(([key, wanted]) => [
          fileOf.get(key),
          wanted ? 'preloaded' : 'not preloaded',
        ]),
      ),
    );
  }

  /* Counted once, from the reference page: the mapping test has just established the list is the same on
     all of them, and summing per page would report the same number thirty-eight times. */
  const bytes = [...facePreloadFiles(pages[0].html)].reduce(
    (total, name) => total + (fonts.get(name) ?? 0),
    0,
  );
  expect(
    bytes,
    `the head preloads ${bytes} bytes of font, over the ${PRELOAD_CEILING / 1024} KiB ceiling`,
  ).toBeLessThanOrEqual(PRELOAD_CEILING);
});
