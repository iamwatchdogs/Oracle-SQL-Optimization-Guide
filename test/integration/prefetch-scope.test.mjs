/*
 * The prefetch SCOPE, as the production build ships it: which anchors carry `data-astro-prefetch`, and
 * what `astro.config.mjs` says decides that.
 *
 * A sibling of `render-blocking-css.test.mjs` and `code-block-css.test.mjs`, reading `dist/` for the reason
 * `test/support/built-site.mjs` gives in its header: which anchors a browser hands an `IntersectionObserver`
 * is not a property of any source file. It is decided by `astro.config.mjs` and by the marks the components
 * render, and neither is visible from the built markup alone.
 *
 * THE DEFECT, measured on this build rather than argued. The setting was `prefetch: { prefetchAll: true,
 * defaultStrategy: 'viewport' }`, and `prefetchAll: true` is not a scope, it is the absence of one:
 * `elMatchesStrategy` (`node_modules/astro/dist/prefetch/index.js:161-177`) treats a link with NO
 * `data-astro-prefetch` attribute as eligible for `defaultStrategy`, so every anchor in the document got the
 * viewport strategy, and `initViewportStrategy` (`index.js:78-90`) then walks
 * `document.getElementsByTagName('a')` and observes each one under a 300 ms dwell timer
 * (`index.js:101-108`). That is 2,487 anchors across the thirty-eight built pages — 72 on `/00-preface/`,
 * 129 on `/00-preface/02-how-to-prove-a-win/`, 115 on the home page. In a browser on
 * `/00-preface/01-why-evidence-grades/`, a cold load then a scroll to the foot issued 3 prefetch requests
 * and opening `Contents` issued 10.
 *
 * The comment above the setting said "every pager cell and nav link is a likely next read" — a claim about
 * eleven links, not two thousand. This file holds the arithmetic and the config, `prefetch-eligibility.test.mjs`
 * holds the scope role by role, and `test/e2e/prefetch-scope.spec.mjs` holds the browser.
 *
 * WHERE THE SCOPE IS WRITTEN DOWN, and why not here: `ROLES` in `test/support/prefetch.mjs`, beside the reader
 * that finds those links — because which links prefetch is a fact about three files at once.
 */
import path from 'node:path';
import { beforeAll, expect, test } from 'vitest';
import {
  buildIsCurrent,
  distRoot,
  ensureBuild,
  loadBuiltPages,
  walk,
} from '../support/built-site.mjs';
import { anchorTagsOf, eligibleAnchors, isPrefetchEligible } from '../support/prefetch.mjs';
import { ROLES } from '../support/prefetch-roles.mjs';
import { prefetchConfig, readPrefetchBundle, servesAsRoute } from '../support/prefetch-build.mjs';

/**
 * The page the arithmetic in this file is written against.
 *
 * `/00-preface/01-why-evidence-grades/` — 66 anchors before this change, 11 after. Named rather than
 * derived because the ratio is the claim and a claim needs a page to be about; `FIRST_PAGE` in
 * `test/e2e/support/pages.mjs` is the same route for the same reason, and two halves of a measurement that
 * has to agree should not be allowed to pick different pages.
 */
const REFERENCE_PAGE = '/00-preface/01-why-evidence-grades/';

/**
 * The largest number of anchors any page may hand the observer.
 *
 * Nine is the length of the section list — `fallbackSections` (`BaseLayout.astro:54-64`) and the
 * `contributions` array that supersedes it (`[...slug].astro:60-69`), both nine, and both measured as `9`
 * in the region slice on all 38 pages. Two pager cells (`PrevNext.astro:81,98`) make 11 on a page with a
 * `next`, 10 on `/08-bonus-batch-api/`, which has a `prev` and nothing after it. The home page adds the
 * nine contents rows (`HomeTitleBlock.astro:283`) plus the `Begin at Preface` control
 * (`HomeTitleBlock.astro:122`), whose destination is the first of those nine and so costs no extra fetch —
 * for 19. `404.html` has the header list alone, 9.
 *
 * 19 is the arithmetic's own ceiling and nothing is permitted above it, set at the home page rather than the
 * chapter figure because a bound the busiest page in the book can reach is the only one that cannot be met
 * by quietly narrowing the test. Before this change every page sat at its full anchor count, from 15 on the
 * 404 to 129 on `/00-preface/02-how-to-prove-a-win/`.
 */
const ELIGIBLE_CEILING = 19;

/** The three roles that make up the scope, by name, so a change of intent is a change of this list. */
const ELIGIBLE_ROLES = new Set([
  'section nav',
  'pager cell',
  'end-of-book fallback',
  'contents row',
  'begin at preface',
]);

let pages = [];
let bundles = [];
let config = null;
let buildOrigin = '';

/** `data-astro-prefetch="false"`, the documented per-link opt-out (`config.d.ts:1937-1941`). */
const optedOutTag = (tag) => /\bdata-astro-prefetch="false"/u.test(tag);

beforeAll(async () => {
  /*
   * Sequenced, not concurrent: `ensureBuild()` builds when `dist/` is stale or absent, and reading `dist/` in
   * the same `Promise.all` put the reads on a directory the build had not created. On a clean checkout every
   * test here was SKIPPED and the suite reported a failure from `walk` instead of an answer — the silent-check
   * failure `built-site.mjs` opens by warning about, from the other direction.
   */
  buildOrigin = await ensureBuild();
  [pages, bundles, config] = await Promise.all([
    loadBuiltPages(),
    readPrefetchBundle(),
    prefetchConfig(),
  ]);
}, 180_000);

test('every built page is readable, and this is the build they were read from', async () => {
  /*
   * The vacuity guard, and here it guards three separate failure modes. Every assertion below iterates
   * `pages` or `bundles`, so an empty list passes all of them — and an empty list is what a missing
   * `dist/` produces, the configuration a fresh clone is in.
   *
   * `bundles.length === 1` is the other half: the prefetch script is injected by `astro:prefetch`
   * (`prefetch/vite-plugin-prefetch.js:8-13`) whenever `prefetch` is truthy, so a build with no bundle is a
   * build where prefetching was switched off. That has to be red rather than green — "no links prefetch"
   * satisfies every scope assertion in this file, and a suite that cannot tell a narrowed scope from a
   * deleted feature is not guarding a scope.
   */
  expect(pages.length, 'the built site has no pages to check').toBeGreaterThan(30);
  expect(buildOrigin, 'the build was never resolved').toMatch(
    /^built dist\/|^reused the build|^waited for another test file/u,
  );
  expect(await buildIsCurrent(), 'the build on disk predates the config that shaped it').toBe(true);
  expect(
    bundles.length,
    'the build ships no prefetch runtime, so prefetching is off entirely',
  ).toBe(1);
  expect(bundles[0].code.length, 'the prefetch runtime is empty').toBeGreaterThan(1000);
});

test('the runtime is the narrowed one, and the config says so in the file the build read', () => {
  /*
   * THE DRIFT GUARD, and the whole reason `prefetchConfig()` reads source text.
   *
   * There is no selector to drift, because Astro 7.3.3 has none: eligibility is `data-astro-prefetch` plus
   * `prefetchAll`, and `prefetchAll` is the config value that decides whether an unmarked anchor is
   * eligible at all (`index.js:170`). These two assertions are the test's statement of that.
   *
   * `hasPrefetchAllKey` is the non-obvious one, and writing the key out is not the same as omitting it.
   * Under `<ClientRouter />` the difference is the whole setting: `ClientRouter.astro:151-153` calls
   * `init({ prefetchAll: true })` and `init` assigns with `??=` (`index.js:15`), so it fills in an
   * `undefined` and cannot override a declared `false`. Remove the key and `JSON.stringify(undefined)` bakes
   * the bare identifier `undefined`, `??=` assigns `true`, and every anchor on every page is eligible again.
   *
   * `defaultStrategy` is `'viewport'` and stays it, for the reasons in the `prefetch` comment in
   * `astro.config.mjs` — chiefly that the section list is inside a CLOSED `<details>` (BaseLayout.astro:460).
   *
   * The bundle assertions are the floor, not the proof: they establish that the runtime Astro bakes into
   * `dist/` is a prefetch runtime at all and carries the four strategy names it compares. What it baked the
   * boolean as is a renamed local (`r=!1`), and no regex over that is worth trusting.
   */
  expect(config.declared, 'astro.config.mjs declares no prefetch block').toBe(true);
  expect(config.hasPrefetchAllKey, 'prefetchAll is not written out in astro.config.mjs').toBe(true);
  expect(
    config.prefetchAll,
    'prefetchAll is on, so every anchor without data-astro-prefetch is eligible again',
  ).toBe(false);
  expect(
    config.defaultStrategy,
    'the default strategy changed; the config comment argues for viewport',
  ).toBe('viewport');

  const { code } = bundles[0];
  for (const strategy of ['tap', 'hover', 'viewport', 'load']) {
    expect(code, `the shipped runtime never mentions the "${strategy}" strategy`).toContain(
      strategy,
    );
  }
  expect(code, 'the shipped runtime does not read data-astro-prefetch').toContain('astroPrefetch');
});

test('the eligible set on every page is exactly the roles the scope names', () => {
  /*
   * The scope itself, as an equality of DOCUMENT POSITIONS — `at`, an anchor's offset in the page. Not hrefs,
   * which repeat inside the intended set: the home page's nine contents rows point at the same nine routes as
   * the header's nine section links, and on most chapters the pager's `prev` IS the section index the reader
   * is inside, so an href comparison is blind to multiplicity — an earlier version tried to patch that with a
   * count assertion and counted the pager's `prev` as a section-nav row (`10` against `9`). Not whole opening
   * tags either: a chapter renders `<a href="/…/">` with nothing else often enough that two cross-references
   * come out byte-identical, which `prefetch-eligibility.test.mjs` measured as eight links collapsed into
   * one. `at` is exact; the lists are sorted because the expected one is built role by role.
   */
  const intended = ROLES.filter((role) => ELIGIBLE_ROLES.has(role.role));

  for (const { file, html } of pages) {
    /* A loop rather than a `flatMap`, which reads better and which `unicorn/no-array-callback-reference`
       flags when the role objects carry a method named `find` — a call inside an arrow, not a bare
       reference, so the rule is reading past the callback it was written for. Hence `anchors`. */
    const expected = [];
    for (const role of intended) {
      expected.push(...role.anchors(html));
    }
    expect(
      eligibleAnchors(html)
        .map(({ at }) => at)
        .toSorted((a, b) => a - b),
      `${file} hands the observer anchors that are not the section list, the pager and the contents list`,
    ).toEqual(expected.map(({ at }) => at).toSorted((a, b) => a - b));
  }
});

test('no page hands the observer more anchors than the ceiling, and the reference page is eleven', () => {
  /*
   * The "small, bounded number" claim, with the arithmetic in `ELIGIBLE_CEILING` above it and the reference
   * page named at the top of this file. That page's count is asserted EXACTLY rather than as a bound: it is
   * the page the measurement is about, its number is 11 = 9 + `prev` + `next`, and a bound here would let
   * the figure drift a link at a time without anything going red — which is how 72 became the number this
   * change exists to correct.
   */
  const counts = pages.map(({ file, html }) => ({
    file,
    total: anchorTagsOf(html).length,
    eligible: eligibleAnchors(html).length,
  }));

  for (const { file, total, eligible } of counts) {
    expect(eligible, `${file} hands the observer ${eligible} anchors`).toBeLessThanOrEqual(
      ELIGIBLE_CEILING,
    );
    /*
     * The anti-vacuity half of the same claim: a page with almost no links would satisfy the ceiling
     * without having been scoped at all. Every page here carries the same fixed chrome, so none is near zero.
     */
    expect(
      total,
      `${file} has almost no anchors, so the ceiling proves nothing here`,
    ).toBeGreaterThan(10);
  }

  const reference = counts.find(({ file }) => file === REFERENCE_PAGE);
  expect(reference, `the reference page ${REFERENCE_PAGE} was not built`).toBeDefined();
  expect(
    reference.total,
    `${REFERENCE_PAGE} changed shape; the ratio in this file is about it`,
  ).toBe(66);
  expect(
    reference.eligible,
    `${REFERENCE_PAGE} prefetches more than its pager and section list`,
  ).toBe(11);
});

test('every eligible href is a same-origin route this build actually serves', async () => {
  /*
   * The last thing a scope can get wrong in a way no count above would show: marking a link that cannot
   * prefetch. `canPrefetchUrl` (`prefetch/index.js:151-160`) requires `navigator.onLine`, a URL that resolves,
   * the same origin, a different pathname or search, and a URL not already prefetched. The last of those is a
   * runtime `Set` (`index.js:4,131`) rather than anything a build can see, so a duplicate is free and is not
   * asserted against. What IS asserted is the part the build decides: no fragment, same origin, and a route
   * the deployment has — because a mark on a link to `#something`, or to a path no page serves, is a scope
   * that has quietly claimed a fetch the runtime will refuse.
   */
  const built = new Set((await walk(distRoot)).map((file) => `/${path.relative(distRoot, file)}`));

  for (const { file, html } of pages) {
    for (const { href } of eligibleAnchors(html)) {
      expect(href, `${file} marks a prefetch link with no href`).not.toBe('');
      expect(href, `${file} marks ${href}, which carries a fragment`).not.toContain('#');
      expect(href, `${file} marks ${href}, which leaves this origin`).toMatch(/^\//u);
      expect(
        servesAsRoute(built, href),
        `${file} marks ${href}, which is not a route this build serves`,
      ).toBe(true);
    }
  }

  /*
   * And the file set is not empty. `dist/` holds 66 files here — 38 pages plus 28 assets — and the floor is the
   * page count, which is the part this check reads: a walk that found nothing would make every assertion in
   * the loop above vacuously true.
   */
  expect(
    built.size,
    'the build served no files, so nothing could be checked',
  ).toBeGreaterThanOrEqual(pages.length);
});

test('the runtime rule this file reimplements is the one the bundle ships', () => {
  /*
   * A guard on the guard. `isPrefetchEligible` is eleven lines of boolean logic copied out of Astro so the
   * tests can run outside a bundler, and a copy is only as good as its agreement with the original. The bundle
   * is the original: `elMatchesStrategy` reads `dataset.astroPrefetch` and honours `data-astro-prefetch="false"`
   * as an opt-out (`index.js:163-171`), which is exactly the two cases this file's copy distinguishes.
   *
   * This is the narrowest useful form. The strategy half of `elMatchesStrategy` cannot be compared this way —
   * `defaultStrategy` is baked as a renamed local — and does not need to be: the config assertion above pins
   * the strategy, and the browser spec proves the pair behave together.
   */
  expect(bundles[0].code, 'the bundle no longer opts out on data-astro-prefetch="false"').toContain(
    '`false`',
  );
  expect(bundles[0].code, 'the bundle no longer reads the astroPrefetch dataset key').toContain(
    'astroPrefetch',
  );

  for (const { file, html } of pages) {
    const tags = anchorTagsOf(html);
    expect(
      tags.filter((tag) => optedOutTag(tag) && isPrefetchEligible({ tag })),
      `${file} marks a data-astro-prefetch="false" link as eligible`,
    ).toEqual([]);
    expect(
      tags.filter((tag) => optedOutTag(tag)),
      `${file} opted a link out of prefetching`,
    ).toEqual([]);
  }
});
