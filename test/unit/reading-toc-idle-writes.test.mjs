import { expect, test } from 'vitest';
import {
  buildController,
  createFakeNode,
  createHarness,
} from '../fixtures/reading-toc.fixtures.mjs';

/*
 * What `setActiveState` COSTS, as distinct from what it decides.
 *
 * `ReadingToc.astro` ships every link already carrying `data-active="false"`
 * (`:66` for the rail, `:129` for the outline) and no `aria-current`, and
 * `resolveActiveId` returns `entries[0].id` whenever `scrollTop <= 2`. So on a
 * cold load — which is every cold load — the loop walks all 84 anchors of the
 * flagship page. Two of them, the pair for the first heading, genuinely change and
 * have to be written. The other 82 already say exactly what the loop is about to
 * say: 82 `dataset` writes restating `data-active="false"`, and 82
 * `removeAttribute` calls for an `aria-current` that was never there. So 164 of
 * the 168 writes on that load are redundant.
 *
 * None of that shows up in the output. The highlight, the `aria-current` name and
 * the mobile readout come out identical whether the values are written or
 * skipped, which is exactly why it survived: an assertion on the rendered state
 * passes either way. The waste is in the side effects. An anchor carries
 * `transition-colors` and six `data-[active=true]:*` variants
 * (`ReadingToc.astro:25-31`), so each redundant write dirties style on an element
 * the compositor then has to re-evaluate. Counting writes is the only instrument
 * that can see it.
 *
 * So the tests below come in three parts and the fix has to keep them apart:
 *
 * 1. the cold-load case, where the inactive headings already hold the value the
 *    loop would give them and must not be written at all, while the heading that
 *    is actually activating still has to be;
 * 2. the mid-scroll case, where the same holds with three headings and the
 *    newly-active one in the middle;
 * 3. the state itself, which must come out the same as unconditional writes would
 *    leave it — a cost change, not a behaviour change, holding before AND after.
 *
 * A fourth covers the half "skip when it matches" alone would let through —
 * skipping correctly AND writing correctly. A comparison that never writes is
 * green on the first test and broken on the second.
 *
 * On the phrase "a cold load writes NOTHING": not available here, and the reason
 * is worth recording. The server never renders `data-active="true"` on anything,
 * so activating the first heading means flipping its pair to `'true'` and naming
 * it — four writes that are not redundant and that any correct fix must still
 * perform. A cold load writes nothing only when the list already agrees with the
 * resolver, which is not the state the server ships and which the last test pins
 * down instead. The retired work is the inactive 82, and that is what test one
 * counts.
 *
 * DOM order is the real one throughout — whole rail, then whole outline — and ids
 * are letter-leading, because `findById` reaches `querySelector('#id')` unescaped
 * and a digit-leading id throws into the scan fallback that
 * `reading-toc-controller.test.mjs` covers instead.
 */

/*
 * `createFakeNode` tracks rect reads and listener registrations but not writes,
 * and the writes are the entire subject here, so the counters are bolted on in
 * this file rather than added to the shared fixture: eight other specs consume
 * `createFakeNode` and none asks how many times a value was restated.
 *
 * Both routes are counted — `anchor.dataset.active` for the highlight,
 * `setAttribute`/`removeAttribute` for the accessible name — because a counter on
 * one route alone would let half of each anchor's no-ops hide behind the other.
 */
function countWrites(node) {
  const writes = { dataset: 0, removeAttribute: 0, setAttribute: 0 };
  node.dataset = new Proxy(node.dataset, {
    set(data, property, value) {
      writes.dataset += 1;
      data[property] = value;
      return true;
    },
  });
  const { removeAttribute, setAttribute } = node;
  node.setAttribute = (name, value) => {
    writes.setAttribute += 1;
    setAttribute.call(node, name, value);
  };
  node.removeAttribute = (name) => {
    writes.removeAttribute += 1;
    removeAttribute.call(node, name);
  };
  return Object.assign(node, {
    writes,
    resetWrites() {
      writes.dataset = 0;
      writes.removeAttribute = 0;
      writes.setAttribute = 0;
    },
  });
}

const link = (id, text, active = 'false') =>
  countWrites(createFakeNode({ dataset: { tocLink: id, active }, text }));

/* One heading rendered twice, as the two navs render it. */
const anchors = (id, text, active = 'false') => [link(id, text, active), link(id, text, active)];

const section = (id, rect) => createFakeNode({ id, rect });

const writesOn = (nodes) =>
  nodes.reduce(
    (total, node) =>
      total + node.writes.dataset + node.writes.removeAttribute + node.writes.setAttribute,
    0,
  );

const stateOf = (node) => ({
  active: node.dataset.active,
  current: node.getAttribute('aria-current'),
});

/*
 * One page load, handed back with everything the assertions read. `scrollY` is
 * mid-page unless a caller says otherwise: at 0 the resolver short-circuits to the
 * first heading and never reads a rect — the cold-load path, right for write
 * counts but wrong for proving the band scan ran.
 */
function load({ links, sections, scrollY = 640, maxScroll = 0 }) {
  const currentLabel = createFakeNode();
  const harness = createHarness({
    links,
    sections,
    currentLabel,
    mobile: createFakeNode(),
    scrollY,
    maxScroll,
  });

  buildController(harness).pageLoad();
  return { ...harness, currentLabel };
}

test('a cold load that activates the first heading writes only the anchors that change', () => {
  const [introRail, introOutline] = anchors('intro', 'Intro');
  const [laterRail, laterOutline] = anchors('later', 'Later');
  const links = [introRail, laterRail, introOutline, laterOutline];
  const sections = new Map([
    ['intro', section('intro', { top: 900, bottom: 1000 })],
    ['later', section('later', { top: 1400, bottom: 1500 })],
  ]);

  load({ links, sections, scrollY: 0, maxScroll: 4000 });

  /*
   * `maxScroll: 4000` with `scrollY: 0` skips the page-bottom case, so the
   * resolver reaches the top-of-document case and names `entries[0]` without
   * touching a single rect. Zero rect reads and zero redundant writes are
   * different facts, so both are asserted: the first pins which path ran, the
   * second is the guard.
   */
  expect(Array.from(sections.values(), (node) => node.rectCalls)).toEqual([0, 0]);

  /*
   * `later` is inactive, and inactive is exactly what it already reads:
   * `data-active="false"` and no `aria-current`. Both its anchors must be left
   * alone — on the flagship page this is the whole of the retired work: 41
   * inactive headings, 82 anchors, 164 writes that changed nothing.
   */
  expect(writesOn([laterRail, laterOutline])).toBe(0);

  /*
   * The four that remain DO change a value: `intro` goes from the server's
   * `'false'` to `'true'` and gains the accessible name, on both its anchors,
   * because the rail and the outline are on screen at complementary breakpoints.
   * This is the half a fix must not skip — the headline is 4 writes here, not 8.
   */
  expect(introRail.writes).toEqual({ dataset: 1, removeAttribute: 0, setAttribute: 1 });
  expect(introOutline.writes).toEqual({ dataset: 1, removeAttribute: 0, setAttribute: 1 });
  expect(writesOn(links)).toBe(4);

  // And the state is still right, which is the point: fewer writes, same result.
  expect(stateOf(introRail)).toEqual({ active: 'true', current: 'location' });
  expect(stateOf(introOutline)).toEqual({ active: 'true', current: 'location' });
  expect(stateOf(laterRail)).toEqual({ active: 'false', current: null });
  expect(stateOf(laterOutline)).toEqual({ active: 'false', current: null });
});

test('activating a later heading writes only the two anchors that change', () => {
  const [introRail, introOutline] = anchors('intro', 'Intro');
  const [middleRail, middleOutline] = anchors('middle', 'Middle');
  const [laterRail, laterOutline] = anchors('later', 'Later');
  const links = [introRail, middleRail, laterRail, introOutline, middleOutline, laterOutline];
  const sections = new Map([
    ['intro', section('intro', { top: -900, bottom: -800 })],
    ['middle', section('middle', { top: 140, bottom: 200 })],
    ['later', section('later', { top: 600, bottom: 700 })],
  ]);

  load({ links, sections });

  /*
   * 140..200 sits inside the 120..280 band, so the scan resolves `middle` and
   * every heading is still measured exactly once. The optimisation retires
   * writes, not geometry — a resolver that stopped measuring would resolve the
   * right id for the wrong reason.
   */
  expect(Array.from(sections.values(), (node) => node.rectCalls)).toEqual([1, 1, 1]);

  // Each of the newly-active pair flips one dataset value and adds one attribute.
  expect(middleRail.writes).toEqual({ dataset: 1, removeAttribute: 0, setAttribute: 1 });
  expect(middleOutline.writes).toEqual({ dataset: 1, removeAttribute: 0, setAttribute: 1 });

  /*
   * `intro` and `later` are untouched by this activation: both already read
   * `data-active="false"` with no `aria-current`, which is precisely what an
   * inactive heading should read. Clearing them is the 8 writes this retires.
   */
  expect(writesOn([introRail, introOutline, laterRail, laterOutline])).toBe(0);
  expect(writesOn(links)).toBe(4);
});

test('the visible state is what unconditional writes would have left', () => {
  const [introRail, introOutline] = anchors('intro', 'Intro');
  const [middleRail, middleOutline] = anchors('middle', 'Middle');
  const [laterRail, laterOutline] = anchors('later', 'Later');
  const links = [introRail, middleRail, laterRail, introOutline, middleOutline, laterOutline];
  const sections = new Map([
    ['intro', section('intro', { top: -900, bottom: -800 })],
    ['middle', section('middle', { top: 140, bottom: 200 })],
    ['later', section('later', { top: 600, bottom: 700 })],
  ]);

  load({ links, sections });

  /*
   * Unconditional writes are the specification: `data-active="true"` and
   * `aria-current="location"` on both anchors of the resolved heading,
   * `data-active="false"` and no `aria-current` everywhere else. Spelling that out
   * per anchor is the whole non-regression claim, and it holds before AND after —
   * a cost fix that quietly became a behaviour fix fails exactly one of these six.
   */
  expect(stateOf(introRail)).toEqual({ active: 'false', current: null });
  expect(stateOf(middleRail)).toEqual({ active: 'true', current: 'location' });
  expect(stateOf(laterRail)).toEqual({ active: 'false', current: null });
  expect(stateOf(introOutline)).toEqual({ active: 'false', current: null });
  expect(stateOf(middleOutline)).toEqual({ active: 'true', current: 'location' });
  expect(stateOf(laterOutline)).toEqual({ active: 'false', current: null });

  // Both navs have to agree, or the highlight dies at one of the breakpoints.
  expect(stateOf(introRail)).toEqual(stateOf(introOutline));
  expect(stateOf(middleRail)).toEqual(stateOf(middleOutline));
  expect(stateOf(laterRail)).toEqual(stateOf(laterOutline));
});

test('an anchor whose state already matches is skipped, and one that is wrong is still written', () => {
  const [introRail, introOutline] = anchors('intro', 'Intro', 'true');
  const [laterRail, laterOutline] = anchors('later', 'Later');
  const links = [introRail, laterRail, introOutline, laterOutline];
  const sections = new Map([
    ['intro', section('intro', { top: 900, bottom: 1000 })],
    ['later', section('later', { top: 1400, bottom: 1500 })],
  ]);

  /*
   * `createFakeNode`'s options are `id`, `dataset`, `text` and `rect` — no
   * `attributes` seed, and `getAttribute('aria-current')` reads the plain Map, not
   * `dataset`. So a pre-set `aria-current` goes in through the same `setAttribute`
   * a real write uses, and the counters are zeroed straight after so the seeding
   * cannot be miscounted as the controller's work. `data-active` needs no such
   * dance: the fake special-cases it onto `dataset`, which `anchors(.., 'true')`
   * already seeded.
   */
  for (const anchor of [introRail, introOutline]) {
    anchor.setAttribute('aria-current', 'location');
    anchor.resetWrites();
  }

  const { windowRef } = load({ links, sections, scrollY: 0, maxScroll: 4000 });

  // The resolver agrees with what the server rendered: nothing to say, nothing to write.
  expect(stateOf(introRail)).toEqual({ active: 'true', current: 'location' });
  expect(stateOf(introOutline)).toEqual({ active: 'true', current: 'location' });
  expect(writesOn(links)).toBe(0);

  sections.get('intro').setRect({ top: -900, bottom: -800 });
  sections.get('later').setRect({ top: 140, bottom: 200 });
  windowRef.scrollY = 1300;
  windowRef.dispatchEvent('scroll');
  windowRef.runAnimationFrames();

  /*
   * Now `intro` is genuinely wrong — highlighted, still named by `aria-current`,
   * while `later` is the heading being read — so BOTH of its anchors have to be
   * corrected on both routes. A comparison that decides correctly and then fails
   * to act is the bug this half exists to catch; it would leave the highlight
   * and the accessible name pointing at two different headings.
   */
  expect(stateOf(introRail)).toEqual({ active: 'false', current: null });
  expect(introRail.writes).toEqual({ dataset: 1, removeAttribute: 1, setAttribute: 0 });
  expect(introOutline.writes).toEqual({ dataset: 1, removeAttribute: 1, setAttribute: 0 });
  expect(stateOf(laterRail)).toEqual({ active: 'true', current: 'location' });
  expect(stateOf(laterOutline)).toEqual({ active: 'true', current: 'location' });
});
