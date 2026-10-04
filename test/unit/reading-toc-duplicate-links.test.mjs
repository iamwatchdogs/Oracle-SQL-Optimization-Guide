import { expect, test } from 'vitest';
import {
  buildController,
  createFakeNode,
  createHarness,
} from '../fixtures/reading-toc.fixtures.mjs';

/*
 * ReadingToc.astro renders TWO anchors per heading: the desktop rail nav and the
 * mobile outline nav, each one mapping over all `headings` and each carrying
 * `data-toc-link={h.id}`. So `querySelectorAll('[data-toc-link]')` returns 84
 * anchors for a 42-heading page, and `collectEntries` used to mint one entry per
 * ANCHOR rather than one per HEADING.
 *
 * None of that was visible in the output — the writes were already per anchor,
 * so the highlight, `aria-current` and the mobile label all came out right — and
 * it was paid for three times over. Every rect read happened twice per heading
 * per band scan, twice the elements entered the IntersectionObserver, and the
 * doubled entry list minted two closures per heading — 84 on the flagship page,
 * each capturing its own per-anchor `entry` — where one per heading would do,
 * while also making `setActiveState` perform 168 attribute writes where 84
 * would, 83 of them no-ops that still dirty style and invalidate.
 *
 * So the tests below come in two halves, and the fix has to keep them apart:
 * geometry, observation and the handler CLOSURE are per HEADING, while the
 * click registrations and the attribute writes stay per ANCHOR. De-duplicating
 * the entries without widening them would strand one of each pair of lists on
 * whatever it was rendered with; attaching the handler to one anchor of the pair
 * would kill panel-close at the breakpoint where the other one is the one on
 * screen.
 *
 * The DOM order modelled throughout is the real one — the whole rail, then the
 * whole outline — because an interleaved list is what the template reads like,
 * and it changes which duplicate the band scan meets first.
 *
 * Ids are letter-leading on purpose: `findById` reaches `querySelector('#id')`
 * unescaped, and a digit-leading id throws into the `getElementsByTagName` scan
 * fallback, which `reading-toc-controller.test.mjs` covers instead.
 */
const link = (id, text, active = 'false') =>
  createFakeNode({ dataset: { tocLink: id, active }, text });

/* One heading rendered twice, as the two navs render it. */
const anchors = (id, text) => [link(id, text), link(id, text)];

const section = (id, rect) => createFakeNode({ id, rect });

const clicksOn = (node) => node.listeners.filter((entry) => entry.type === 'click');

const clickListeners = (links) => links.map((node) => clicksOn(node));

/*
 * Runs one page load and hands back everything the assertions read. `scrollY`
 * is mid-page in every caller: at 0 the resolver short-circuits to the first
 * heading, which would leave every rect unread and make the counting assertions
 * pass for the wrong reason.
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

test('geometry is measured once per heading, not once per anchor', () => {
  const [rail, outline] = anchors('intro', 'Intro');
  const sections = new Map([['intro', section('intro', { top: 140, bottom: 200 })]]);

  load({ links: [rail, outline], sections });

  // One scan of one heading: the outline anchor must not re-measure a rect the
  // rail anchor already read in this same pass.
  expect(sections.get('intro').rectCalls).toBe(1);
});

test('the observer subscribes to each heading once, not once per anchor', () => {
  const [rail, outline] = anchors('intro', 'Intro');
  const target = section('intro', { top: 140, bottom: 200 });
  const { Observer } = load({
    links: [rail, outline],
    sections: new Map([['intro', target]]),
  });

  /*
   * A repeated `observe` of the same element is not free — the observer keeps
   * one record per subscription and re-runs its bookkeeping on each — so 42
   * headings were arriving as 84 targets carrying no extra information.
   */
  expect(Observer.instances).toHaveLength(1);
  expect(Observer.instances[0].observed).toHaveLength(1);
  expect(Observer.instances[0].observed.filter((node) => node === target)).toHaveLength(1);
});

test('one distinct click handler per unique heading id, shared by both anchors', () => {
  const [introRail, introOutline] = anchors('intro', 'Intro');
  const [laterRail, laterOutline] = anchors('later', 'Later');
  const links = [introRail, laterRail, introOutline, laterOutline];
  const uniqueIds = new Set(links.map((node) => node.dataset.tocLink));

  load({
    links,
    sections: new Map([
      ['intro', section('intro', { top: 140, bottom: 200 })],
      ['later', section('later', { top: 600, bottom: 700 })],
    ]),
  });

  /*
   * The registrations are NOT being halved, because the rail is `hidden
   * lg:block` and the outline is `lg:hidden`: at any one viewport exactly one
   * of the pair is clickable, so both anchors need a handler or panel-close
   * dies at the other breakpoint. What is being retired is the duplicated
   * CLOSURE — 84 of them on the flagship page, each one capturing its own
   * per-anchor `entry` and its own `id`, all doing identical work. One closure
   * per heading, registered on both of that heading's anchors, is the shape that
   * removes the duplication without touching what a click does.
   */
  const perAnchor = clickListeners(links);
  const handlers = perAnchor.flat().map((entry) => entry.handler);

  expect(uniqueIds.size).toBe(2);
  // Still one registration per anchor — 4 of them, not 2.
  expect(handlers).toHaveLength(links.length);
  expect(perAnchor.map((entries) => entries.length)).toEqual([1, 1, 1, 1]);
  // One CLOSURE per heading: this is the number that was doubled.
  expect(new Set(handlers).size).toBe(uniqueIds.size);
  expect(clicksOn(introRail)[0].handler).toBe(clicksOn(introOutline)[0].handler);
});

test('every anchor of the active heading is restated, and the inactive one is cleared', () => {
  const [introRail, introOutline] = anchors('intro', 'Intro');
  const later = link('later', 'Later');

  load({
    links: [introRail, later, introOutline],
    sections: new Map([
      ['intro', section('intro', { top: 140, bottom: 200 })],
      ['later', section('later', { top: 600, bottom: 700 })],
    ]),
  });

  /*
   * Both navs are on screen at different breakpoints, so both anchors have to
   * carry the state. Collapsing the pair into one entry and writing to a single
   * representative would strand the other list on its rendered
   * `data-active="false"`, which both the highlight selector and the
   * `aria-current` name are read from.
   */
  expect(introRail.dataset.active).toBe('true');
  expect(introRail.getAttribute('aria-current')).toBe('location');
  expect(introOutline.dataset.active).toBe('true');
  expect(introOutline.getAttribute('aria-current')).toBe('location');
  expect(later.dataset.active).toBe('false');
  expect(later.getAttribute('aria-current')).toBeNull();
});

test('the mobile current label reads the heading text from duplicated anchors', () => {
  const [rail, outline] = anchors('intro', 'Intro');
  const { currentLabel } = load({
    links: [rail, outline],
    sections: new Map([['intro', section('intro', { top: 140, bottom: 200 })]]),
  });

  /*
   * The readout sits in the summary of the mobile disclosure, beside the
   * ordinal, so it has to resolve through the trailing heading span of whichever
   * anchor represents the entry. The ordinal is a visual index and is
   * `aria-hidden`, so a "01 " prefix here is wrong twice over.
   */
  expect(currentLabel.textContent).toBe('Intro');
  expect(currentLabel.textContent).not.toContain('01');
});

test('with duplicate ids across both lists the mobile label names the heading it points at', () => {
  const [introRail, introOutline] = anchors('intro', 'Intro');
  const [laterRail, laterOutline] = anchors('later', 'Later');
  const sections = new Map([
    ['intro', section('intro', { top: -900, bottom: -800 })],
    ['later', section('later', { top: 140, bottom: 200 })],
  ]);
  const { currentLabel, windowRef } = load({
    links: [introRail, laterRail, introOutline, laterOutline],
    sections,
    maxScroll: 4000,
  });

  expect(currentLabel.textContent).toBe('Later');

  sections.get('intro').setRect({ top: 140, bottom: 200 });
  sections.get('later').setRect({ top: 600, bottom: 700 });
  windowRef.scrollY = 1300;
  windowRef.dispatchEvent('scroll');
  windowRef.runAnimationFrames();

  /*
   * The label used to be resolved by `entries.find(...)` over a doubled list,
   * which landed on the right text only because the first match happened to
   * carry the right id. Now that one entry stands for a pair of anchors it has
   * to keep resolving correctly for EACH id within a single page load — a
   * collapsed entry that picked up a sibling's anchors would send the readout
   * to the wrong row.
   */
  expect(currentLabel.textContent).toBe('Intro');
  expect(currentLabel.textContent).not.toContain('01');
});
