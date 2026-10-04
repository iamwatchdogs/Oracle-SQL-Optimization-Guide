import { expect, test } from 'vitest';
import {
  IN_VIEWPORT_HEIGHT,
  buildController,
  createFakeNode,
  createHarness,
} from '../fixtures/reading-toc.fixtures.mjs';

/*
 * WHAT A COLD LOAD COSTS, as distinct from what it decides.
 *
 * `resolveActiveId` (`src/lib/reading-toc-controller.mjs:99`) reads
 * `documentElement.scrollHeight` to work out `maxScroll`, and it reads it on the
 * line ABOVE the `scrollTop <= 2` test at `:106`. That read is a
 * LAYOUT-FLUSHING one: Blink cannot answer it without a style recalc and layout
 * of the whole document, because the value is derived from every box in the page.
 * So a reader who has not scrolled — the cold-load case, and the case every
 * Lighthouse run exercises — pays a forced full-document layout to be told "you
 * are at the top, so it is the first heading". On the flagship page that is 294
 * headings' worth of box calculation on the `astro:page-load` path, to answer a
 * branch whose own input (`window.scrollY`) costs nothing to read.
 *
 * Moving the `scrollTop <= 2` early-out above the `scrollHeight` read makes the
 * common case touch no layout at all and leaves the page-bottom case — the one
 * place `scrollHeight` is load-bearing — exactly as it is. That is a reordering,
 * not a change of outcome, and the tests below sit along that seam:
 *
 * 1. the cold load, where the read count has to be ZERO and not merely smaller.
 *    `toBeGreaterThan(0)` would pass on the unfixed source and guard nothing, so
 *    the asserted value is the one that moves, and it moves to nothing;
 * 2. the mid-document scan, which must still read layout and still measure every
 *    heading exactly once — a resolver that stopped scanning would satisfy the
 *    first test and stop tracking the reader;
 * 3. the page-bottom case, which is why `scrollHeight` cannot simply be deleted
 *    rather than reordered;
 * 4. the resolved id at every position, so a reordering that changed an OUTCOME
 *    fails here even though the read counts would be satisfied.
 *
 * The instrument is a counting getter rather than an assertion on the rendered
 * state, because the rendered state is identical either way: the highlight, the
 * `aria-current` name and the mobile readout all come out the same whether the
 * layout was flushed or not. Only the count of layout reads can see this.
 *
 * DOM order is the real one throughout — whole rail, then whole outline — and ids
 * are letter-leading, because `findById` reaches `querySelector('#id')` unescaped
 * and a digit-leading id throws into the scan fallback that
 * `reading-toc-controller.test.mjs` covers instead.
 */

const link = (id, text, active = 'false') =>
  createFakeNode({ dataset: { tocLink: id, active }, text });

/* One heading rendered twice, as the two navs render it. */
const anchors = (id, text) => [link(id, text), link(id, text)];

const section = (id, rect) => createFakeNode({ id, rect });

const rectCallsOn = (sections) => Array.from(sections.values(), (node) => node.rectCalls);

const stateOf = (node) => ({
  active: node.dataset.active,
  current: node.getAttribute('aria-current'),
});

const CURRENT = { active: 'true', current: 'location' };
const CLEARED = { active: 'false', current: null };

/*
 * Which heading the load named, read back off the anchors — `pageLoad` resolves
 * nothing outward, so the anchors are the only observable record of the decision.
 */
const activeIds = (links) => [
  ...new Set(
    links.filter((node) => node.dataset.active === 'true').map((node) => node.dataset.tocLink),
  ),
];

const HEADINGS = ['intro', 'middle', 'later'];

/*
 * A cold load: every heading sits BELOW the fold, which is what landing on a long
 * article looks like, and which is what makes the early-out load-bearing for the
 * OUTCOME as well as for the cost. The band scan would find nothing in band and
 * nothing above the band here and would answer `null` — naming no heading at all,
 * which is the right answer only because the reader genuinely is above the first
 * heading, and only the early-out says so.
 */
const AT_TOP_RECTS = [
  { top: 900, bottom: 1000 },
  { top: 1400, bottom: 1500 },
  { top: 2200, bottom: 2300 },
];

/*
 * Mid-article: the first heading has been scrolled past, the second sits inside the
 * band (`IN_VIEWPORT_HEIGHT` 800 × 0.15 = 120 through × 0.35 = 280), the third is
 * below it. So the scan resolves `middle`, and `intro` is the only heading at or
 * above the band top, which makes it the `lastAbove` fallback if the band is ever
 * empty.
 */
const MID_ARTICLE_RECTS = [
  { top: -900, bottom: -800 },
  { top: 140, bottom: 200 },
  { top: 600, bottom: 700 },
];

const MAX_SCROLL = 4000;

/*
 * Fresh nodes per call, whole rail then whole outline. Fresh because a load
 * writes `data-active` onto every anchor it visits, so a shared set would carry
 * one row's answer into the next row of the table in the last test.
 */
function article(rects) {
  const pairs = new Map(HEADINGS.map((id) => [id, anchors(id, id)]));
  const rails = [...pairs.values()].map((pair) => pair[0]);
  const outlines = [...pairs.values()].map((pair) => pair[1]);
  return {
    links: [...rails, ...outlines],
    pairs,
    sections: new Map(HEADINGS.map((id, index) => [id, section(id, rects[index])])),
  };
}

/*
 * A `documentElement` whose `scrollHeight` is a counting getter.
 *
 * The fixture seeds `documentElement` as a plain object
 * (`reading-toc.fixtures.mjs:171`), so replacing the whole property with an
 * accessor is a supported move rather than a monkey-patch. The value is
 * `IN_VIEWPORT_HEIGHT + maxScroll`, the same arithmetic the fixture itself uses,
 * so the getter answers exactly what the plain object would have.
 */
function countedScrollHeight(scrollHeight) {
  const probe = { reads: 0 };
  return {
    probe,
    documentElement: {
      get scrollHeight() {
        probe.reads += 1;
        return scrollHeight;
      },
    },
  };
}

/*
 * One page load, with `documentElement` already swapped for the counting getter —
 * installed BEFORE `pageLoad()`, because the read is the subject. Only the load
 * runs: no scroll event, no frame, no observer callback, so every count below is
 * attributable to the single `resolveActiveId` call the load makes. (`sync` in
 * `observeSections` reads `scrollHeight` too, but only once a scroll fires.)
 *
 * `scrollY` is mid-page unless a caller says otherwise.
 */
function load({ links, sections, scrollY = 640, maxScroll = 0 }) {
  const harness = createHarness({
    links,
    sections,
    currentLabel: createFakeNode(),
    mobile: createFakeNode(),
    scrollY,
    maxScroll,
  });
  const counted = countedScrollHeight(IN_VIEWPORT_HEIGHT + maxScroll);
  harness.documentRef.documentElement = counted.documentElement;

  buildController(harness).pageLoad();
  return { ...harness, layout: counted.probe };
}

test('a cold load at the top of the document reads no layout at all', () => {
  const { links, pairs, sections } = article(AT_TOP_RECTS);

  const { layout } = load({ links, sections, scrollY: 0, maxScroll: MAX_SCROLL });

  /*
   * The guard. `maxScroll: 4000` satisfies the page-bottom guard's `maxScroll > 0`
   * test, so a stray bottom-case short-circuit cannot be what is being counted
   * here — and `maxScroll - scrollTop` is 4000, nowhere near the `<= 2` the
   * bottom branch wants either. The top-of-page branch is the only thing that can
   * answer, and answering it must cost nothing. Asserted as an exact zero and not
   * as "fewer than before": the whole cost is the single flush, so a fix that
   * merely deferred the read past the resolver would still be paying it.
   */
  expect(layout.reads, 'documentElement.scrollHeight reads on a cold load').toBe(0);

  // The band scan did not run either: no heading was measured on this load.
  expect(rectCallsOn(sections)).toEqual([0, 0, 0]);

  /*
   * And the outcome is unchanged: the first heading, named on BOTH of its anchors.
   * Rail and outline are `display:none` at complementary breakpoints, so a state
   * applied to one and not the other strands a whole nav on a value neither the
   * highlight selector nor the `aria-current` name is read from.
   */
  expect(activeIds(links)).toEqual(['intro']);
  const [introRail, introOutline] = pairs.get('intro');
  expect(stateOf(introRail)).toEqual(CURRENT);
  expect(stateOf(introOutline)).toEqual(CURRENT);
  expect(stateOf(pairs.get('middle')[0])).toEqual(CLEARED);
  expect(stateOf(pairs.get('later')[0])).toEqual(CLEARED);
});

test('mid-document the band scan still runs, and still pays for the layout it needs', () => {
  const { links, sections } = article(MID_ARTICLE_RECTS);

  const { layout } = load({ links, sections, scrollY: 640, maxScroll: MAX_SCROLL });

  /*
   * 640 is nowhere near `maxScroll - 2`, so neither early-out applies and the
   * resolver cannot answer without measuring. `scrollHeight` is therefore still
   * read: the reorder moves that read BELOW the top-of-page branch, it does not
   * delete it, and this is the row that says so.
   */
  expect(layout.reads, 'documentElement.scrollHeight reads mid-document').toBeGreaterThanOrEqual(1);

  /*
   * Every heading is still measured exactly once. A resolver that reached the right
   * id without scanning would satisfy the read count above and the outcome below
   * while not tracking the reader at all — so this is the half of the guard that
   * the read counts cannot supply.
   */
  expect(rectCallsOn(sections)).toEqual([1, 1, 1]);
  expect(activeIds(links)).toEqual(['middle']);
});

test('the page-bottom case still reads layout, and still names the last heading', () => {
  const { links, pairs, sections } = article(MID_ARTICLE_RECTS);

  const { layout } = load({ links, sections, scrollY: MAX_SCROLL, maxScroll: MAX_SCROLL });

  /*
   * This is the case that keeps `scrollHeight` alive. At the end of the document
   * the last heading is the text being read, and the only way to know the reader is
   * at the end is to compare `scrollTop` against the document's full height —
   * there is no scroll position that identifies "the bottom" without it. So the
   * read is reordered rather than removed: deleting it makes this row resolve
   * `middle` instead of `later`, which the table in the last test catches by
   * outcome.
   */
  expect(
    layout.reads,
    'documentElement.scrollHeight reads at the page bottom',
  ).toBeGreaterThanOrEqual(1);

  /*
   * One layout read and no rects: the bottom case answers from the two
   * document-level values and returns before the scan. True of the current order
   * and of the reordered one — neither order reaches the band scan from here.
   */
  expect(rectCallsOn(sections)).toEqual([0, 0, 0]);

  expect(activeIds(links)).toEqual(['later']);
  expect(stateOf(pairs.get('later')[0])).toEqual(CURRENT);
  expect(stateOf(pairs.get('later')[1])).toEqual(CURRENT);
  expect(stateOf(pairs.get('intro')[0])).toEqual(CLEARED);
  expect(stateOf(pairs.get('middle')[0])).toEqual(CLEARED);
});

test('the resolved heading is the same at every position, whatever order the branches run in', () => {
  /*
   * The read-counting tests above all tolerate an outcome change, because they are
   * about cost. This one is about the decision, and it is the only one that would
   * fail if a reordering went wrong: a threshold nudged, a branch dropped, or the
   * two early-outs swapped would all leave the counts in tests one to three
   * satisfiable while moving a heading.
   *
   * The top three rows are the `<= 2` branch and its immediate neighbours, which
   * is where a careless reorder does its damage — moving the threshold by one
   * pixel moves `scrollY: 3` from the scan to the early-out and names `intro`
   * instead of the heading actually in band.
   */
  const positions = [
    { scrollY: 0, expected: ['intro'], why: 'a cold load' },
    { scrollY: 1, expected: ['intro'], why: 'one pixel down, still the top branch' },
    { scrollY: 2, expected: ['intro'], why: 'the last pixel the top branch claims' },
    { scrollY: 3, expected: ['middle'], why: 'one pixel past the top branch' },
    { scrollY: 640, expected: ['middle'], why: 'mid article, inside the band' },
    { scrollY: MAX_SCROLL, expected: ['later'], why: 'the end of the document' },
  ];

  for (const { scrollY, expected, why } of positions) {
    const { links, sections } = article(MID_ARTICLE_RECTS);
    load({ links, sections, scrollY, maxScroll: MAX_SCROLL });
    expect(activeIds(links), `resolved heading at scrollY ${scrollY} (${why})`).toEqual(expected);
  }
});
