/*
 * Which links a reader's scroll actually fetches, in a browser.
 *
 * `prefetch-scope.test.mjs` proves the scope as the production build marks it: which anchors carry
 * `data-astro-prefetch`, and that `astro.config.mjs` says `prefetchAll: false`. That is the right level for
 * a fact about files on disk, and it cannot say the two things that matter most here.
 *
 *   - That `prefetchAll` is really inert. In the shipped bundle the baked constant is a renamed minifier
 *     local — `dist/_astro/prefetch.*.js` carries `r=!1`, not `prefetchAll = false` — so no regex over it is
 *     worth trusting, and `<ClientRouter />` calls `init({ prefetchAll: true })` from
 *     `ClientRouter.astro:151-153`, which is exactly the kind of thing a markup test cannot see.
 *   - That the marked links are the ones a scroll reaches. The markup is static; the trigger is an
 *     `IntersectionObserver` plus a 300 ms dwell timer (`prefetch/index.js:78-117`), and whether an anchor
 *     is ever observed depends on whether it has a box at the moment it is looked at.
 *
 * THE METHOD, and why it is a set rather than a count. Every assertion is about the SET of requested
 * pathnames: what the reader's gesture was supposed to fetch, derived from the live DOM, against what the
 * network log says it did fetch. Nothing waits on a deadline, nothing asserts "within N ms", nothing counts
 * bytes. The tempting alternative — wait for the two pager requests, then assert — is a race: it passes
 * when the last straggler beats the assertion and fails when it does not, on a machine that is merely busy.
 * `quiesce` replaces the deadline with two waits, and a log still growing when the quiet window runs out is
 * a failure carrying a number in it rather than a flake. Which is what buys the direction that matters: an
 * EXTRA prefetch is the entire defect this file exists for, and only a set comparison catches one.
 *
 * Two facts about the shipped runtime make the expected sets knowable without hard-coding a count:
 *
 *   - The section list lives in a CLOSED `<details id="site-nav">` (`BaseLayout.astro:460`), so it has no
 *     box and is never observed until the reader opens it. Opening `Contents` is therefore a distinct
 *     gesture with a distinct expected set, and the first test can assert that a full scroll of a chapter
 *     fetches the pager and NOT the section list.
 *   - The in-page outline is 34 anchors of `href="#id"` here. `prefetch()` strips the fragment
 *     (`prefetch/index.js:128`) and `canPrefetchUrl` then rejects the result as the current page
 *     (`index.js:156`), so the rail cannot be fetched at all. It is asserted rather than left implicit,
 *     because "34 anchors the observer watches do nothing" is the shape of the waste this change removed.
 *
 * `FIRST_PAGE` from `test/e2e/support/pages.mjs` is the same route the integration test measures, and
 * `test/e2e/support/prefetch.mjs` holds the instruments — the request watcher, the quiescence wait, the
 * scroll, the panel gesture, and the measurement of which of the panel's nine rows a browser could see.
 * Neither file grows a second answer to either question.
 */
import { expect, test } from '@playwright/test';
import { FIRST_PAGE } from './support/pages.mjs';
import {
  expectedDestinations,
  observedDestinations,
  onScreenRows,
  quiesce,
  revealSectionList,
  scrollThrough,
  watchChapterRoutes,
} from './support/prefetch.mjs';

test.use({
  /*
   * Reduced motion, and the reason is a race rather than a preference.
   *
   * The panel opens over a 280ms `grid-template-rows` transition (`src/styles/global.css`,
   * `.disclosure-flow`), so a row can intersect and then leave the growing scrollport before its dwell timer
   * fires — and `prefetch/index.js:109-113` clears the timer when that happens. Measured without this
   * setting: `01-proven-techniques` arrived on some Chromium and Firefox runs and not others, from an
   * identical gesture.
   *
   * `global.css:1864-1900` already zeroes every transition and animation under
   * `prefers-reduced-motion: reduce`, so the panel opens at its final height and every row is stable before
   * the observer samples it. That is not a code path invented for the test — it is what this project
   * already ships to a reader who has asked for less motion, and the scope under test is unchanged by it.
   */
  reducedMotion: 'reduce',
});

/**
 * The anti-vacuity floor, and the first thing every test here asserts.
 *
 * An empty request log satisfies every set comparison in this file, so without a statement about the PAGE a
 * narrowed scope and a broken one are indistinguishable. 66 anchors on this route, of which 34 are the
 * in-page outline and 12 are inside the article.
 */
const expectPageIsSubstantial = (expected) => {
  expect(expected.total, 'the page lost its links, so an empty log would prove nothing').toBe(66);
  expect(
    expected.outline.length,
    'the in-page outline is missing, so its exclusion is untested',
  ).toBe(34);
  expect(
    expected.prose.length,
    'the page has no prose links, so their exclusion is untested',
  ).toBeGreaterThan(10);
  expect(expected.pager.length, 'the pager is missing, so there is nothing to wait for').toBe(2);
};

/**
 * Every section row the browser could actually see was fetched, and at least eight of them.
 *
 * The count is not written down as nine, because it is not nine on the mobile project and `onScreenRows`
 * measures why. Eight is the measured floor across the four browser projects, and its job is to stop a panel
 * that rendered nothing from satisfying the claim.
 */
const expectVisibleRowsWereFetched = async (page, observed, atRest) => {
  const required = [...new Set([...atRest, ...(await onScreenRows(page))])];
  expect(
    required.length,
    `the section panel put only ${required.length} rows on screen, so the assertion below is thin`,
  ).toBeGreaterThanOrEqual(8);
  for (const destination of required) {
    expect(observed, `${destination} was on screen in the panel and never fetched`).toContain(
      destination,
    );
  }
};

const scrollOnly = async ({ page }) => {
  const requests = watchChapterRoutes(page);
  await page.goto(FIRST_PAGE, { waitUntil: 'domcontentloaded' });
  expectPageIsSubstantial(await expectedDestinations(page));

  await scrollThrough(page);
  const expected = await expectedDestinations(page);
  await quiesce(
    requests,
    expected.pager.length,
    'scrolling to the foot of the chapter prefetched nothing',
  );

  /*
   * EXACT equality here, and a subset in the two tests below, and the difference is deliberate. With the
   * panel closed and nothing else done, the only eligible links a scroll can reach are the two pager
   * destinations — there is no observer timing in the way — so this can afford the strongest form.
   */
  expect(
    observedDestinations(requests, page).toSorted(),
    'a full scroll of the chapter fetched something other than the two pager destinations',
  ).toEqual(expected.pager.toSorted());
};

const panelOnly = async ({ page }) => {
  const requests = watchChapterRoutes(page);
  await page.goto(FIRST_PAGE, { waitUntil: 'domcontentloaded' });
  const expected = await expectedDestinations(page);
  expect(expected.sections.length, 'the section list is not nine routes').toBe(9);

  /*
   * Opened at scroll offset 0 and nothing else done, so the ONLY thing that can put a request in the log is
   * the nine anchors becoming visible. The pager is at the foot of the article and is never observed here —
   * which is the assertion that the two gestures are independent, and the reason the first test's
   * expectation is two and this one's is nine rather than eleven.
   */
  const atRest = await revealSectionList(page, requests);
  const observed = observedDestinations(requests, page);

  /*
   * SUBSET, not equality, and `onScreenRows` is why. The defect is an EXTRA prefetch, so the direction
   * that matters is "nothing outside the section list", and that holds identically on all four projects.
   * The other direction, "all nine", is a claim about how much of a scrolling dropdown a browser's
   * IntersectionObserver chose to report — measured, and not the same number everywhere.
   */
  expect(
    observed.filter((destination) => !expected.sections.includes(destination)),
    'opening the section list fetched something outside its nine destinations',
  ).toEqual([]);

  await expectVisibleRowsWereFetched(page, observed, atRest);
};

/**
 * The negative half, on its own run.
 *
 * Separate from the two above because it is the only assertion here the narrowed scope cannot pass by being
 * narrower still. Both groups are named from the live DOM and compared against the WHOLE log, so an extra
 * prefetch anywhere in the run fails it — including one arriving during load rather than during a scroll,
 * which the other two would not see because each ends before the other gesture has happened.
 */
const bothGestures = async ({ page }) => {
  const requests = watchChapterRoutes(page);
  await page.goto(FIRST_PAGE, { waitUntil: 'domcontentloaded' });
  const expected = await expectedDestinations(page);

  /*
   * The scroll is allowed to LAND before the panel is opened, and that ordering is not tidiness.
   * `revealSectionList` clicks the header summary, which scrolls the window back to the top — and a click's
   * actionability check does that faster than the strategy's 300 ms dwell timer
   * (`prefetch/index.js:101-108`) can expire, so a pager link still counting down when the page moves has
   * its timer cleared at `prefetch/index.js:109-113` and is never fetched. Not a flake: it is what a reader
   * who scrolls to the end and immediately reaches for `Contents` does, and this run is not that reader.
   */
  await scrollThrough(page);
  await quiesce(
    requests,
    expected.pager.length,
    'scrolling to the foot of the chapter prefetched nothing',
  );
  const atRest = await revealSectionList(page, requests);

  const observed = new Set(observedDestinations(requests, page));
  const chrome = new Set([...expected.sections, ...expected.pager]);

  expect(
    [...observed].filter((destination) => !chrome.has(destination)),
    'a destination that is neither a section route nor a pager hop was prefetched',
  ).toEqual([]);
  expectProseOnlyDestinationsUntouched(expected.prose, chrome, observed);
  expectWordmarkUntouched(expected.root, observed);
  await expectVisibleRowsWereFetched(page, observed, atRest);
  expectRuntimeStillRunning(expected.pager, observed);
};

/**
 * The prose cross-references — PROSE-ONLY ones, which is the correction this assertion needed.
 *
 * A first version asserted that no route any link inside `article` points at was fetched, and it failed on
 * all three desktop browsers with a list of section routes: a chapter cross-references `/04-recipes/` in its
 * prose AND the section list offers `/04-recipes/`, so the destination is fetched because of the section
 * list and the assertion could not tell the two apart.
 *
 * What the scope claims is about ANCHORS — no anchor inside the reading column is eligible, which
 * `prefetch-scope.test.mjs` asserts exhaustively against the markup. In a browser the claim that survives
 * is the one about destinations: nothing was fetched that ONLY the prose offers. The floor below is what
 * stops that list being empty on a chapter with no prose-only link, which would make the assertion vacuous.
 */
const expectProseOnlyDestinationsUntouched = (prose, chrome, observed) => {
  const proseOnly = prose.filter((pathname) => !chrome.has(pathname));
  expect(
    proseOnly.length,
    'no link in the reading column points anywhere the chrome does not, so its exclusion is untested',
  ).toBeGreaterThan(0);
  expect(
    proseOnly.filter((pathname) => observed.has(pathname)),
    'a destination only the reading column links to was prefetched, which is what the scope excludes',
  ).toEqual([]);
};

/** The wordmark, separately, because it is the site root and so is one of the prose-only paths. */
const expectWordmarkUntouched = (root, observed) => {
  expect(
    root.filter((pathname) => observed.has(pathname)),
    'the running-head wordmark was prefetched; it is in the first viewport on all 38 pages',
  ).toEqual([]);
};

/**
 * The runtime is still RUNNING — the regression guard for this file.
 *
 * A build with prefetching switched off fetches nothing at all and passes every subset assertion above, since
 * an empty set is a subset of anything. Asserting that the pager and the rows the reader could see were
 * fetched is what makes those subsets mean "these and no more" rather than "at most these" — and it is why
 * this sits with the negative assertions instead of being folded into either.
 */
const expectRuntimeStillRunning = (pager, observed) => {
  for (const destination of pager) {
    expect(
      observed.has(destination),
      `${destination} is a pager hop and was never prefetched`,
    ).toBe(true);
  }
  expect(
    observed.size,
    'the run prefetched nothing at all, so every subset assertion above was satisfied vacuously',
  ).toBeGreaterThanOrEqual(pager.length);
};

test.describe('cold load — prefetch reaches the pager and the section list, and nothing else', () => {
  test('scrolling a whole chapter fetches the pager and nothing else', scrollOnly);
  test('opening Contents fetches only the section list', panelOnly);
  test('the in-page outline and the prose cross-references are never fetched', bothGestures);
});
