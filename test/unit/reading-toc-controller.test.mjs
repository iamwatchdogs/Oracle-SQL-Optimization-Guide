import { expect, test } from 'vitest';
import {
  BAND_BOTTOM,
  BAND_TOP,
  buildController,
  createFakeNode,
  createHarness,
  runPageLoad,
} from '../fixtures/reading-toc.fixtures.mjs';

const link = (id, text, active = 'false') =>
  createFakeNode({ dataset: { tocLink: id, active }, text });

const section = (id, rect) => createFakeNode({ id, rect });

test('uses the first matched heading for initial no-hash state', () => {
  const missing = link('missing', '', 'false');
  const intro = link('intro', 'Intro');
  const other = link('other', 'Other');
  const currentLabel = createFakeNode();

  runPageLoad({
    links: [missing, intro, other],
    sections: new Map([
      ['intro', section('intro', { top: 100, bottom: 200 })],
      ['other', section('other', { top: 800, bottom: 900 })],
    ]),
    currentLabel,
    mobile: createFakeNode(),
  });

  expect(missing.dataset.active).toBe('false');
  expect(intro.dataset.active).toBe('true');
  expect(other.dataset.active).toBe('false');
  expect(currentLabel.textContent).toBe('Intro');
});

test('activates the first matched heading at the top of the page, band or not', () => {
  const missing = link('missing', '', 'false');
  const intro = link('intro', 'Intro');
  const other = link('other', 'Other');
  const currentLabel = createFakeNode();
  const { documentRef, Observer, windowRef } = createHarness({
    links: [missing, intro, other],
    sections: new Map([
      ['intro', section('intro', { top: 900, bottom: 1000 })],
      ['other', section('other', { top: 1400, bottom: 1500 })],
    ]),
    currentLabel,
    mobile: createFakeNode(),
    scrollY: 0,
  });

  buildController({ documentRef, Observer, windowRef }).pageLoad();

  expect(missing.dataset.active).toBe('false');
  expect(intro.dataset.active).toBe('true');
  expect(other.dataset.active).toBe('false');
  expect(currentLabel.textContent).toBe('Intro');
});

/*
 * This test previously enshrined the very bug it now guards against.
 *
 * `astro:page-load` fires AFTER the router has restored the scroll position, so
 * a back/forward into a scrolled page arrives with a non-zero offset. The old
 * gate measured ONLY `entries[0]`, whose rect was then far above the viewport;
 * the condition failed, no active state was set, and the TOC showed no current
 * section until the reader scrolled. The new gate resolves the band across
 * every entry and falls back to the LAST heading above it, so a restored
 * position past the band DOES activate a section.
 */
test('a restored scroll past the band activates the last heading above it', () => {
  const intro = link('intro', 'Intro');
  const middle = link('middle', 'Middle');
  const later = link('later', 'Later');
  const currentLabel = createFakeNode();

  runPageLoad({
    links: [intro, middle, later],
    sections: new Map([
      ['intro', section('intro', { top: -900, bottom: -800 })],
      ['middle', section('middle', { top: -400, bottom: -300 })],
      ['later', section('later', { top: 500, bottom: 600 })],
    ]),
    currentLabel,
    mobile: createFakeNode(),
    scrollY: 640,
  });

  expect(intro.dataset.active).toBe('false');
  expect(intro.getAttribute('aria-current')).toBeNull();
  expect(middle.dataset.active).toBe('true');
  expect(middle.getAttribute('aria-current')).toBe('location');
  expect(later.dataset.active).toBe('false');
  expect(later.getAttribute('aria-current')).toBeNull();
  expect(currentLabel.textContent).toBe('Middle');
});

test('a heading inside the band outranks one merely above it', () => {
  const above = link('above', 'Above');
  const inside = link('inside', 'Inside');
  const currentLabel = createFakeNode();

  runPageLoad({
    links: [above, inside],
    sections: new Map([
      ['above', section('above', { top: -300, bottom: -200 })],
      ['inside', section('inside', { top: 100, bottom: 200 })],
    ]),
    currentLabel,
    mobile: createFakeNode(),
    scrollY: 640,
  });

  expect(above.dataset.active).toBe('false');
  expect(inside.dataset.active).toBe('true');
  expect(currentLabel.textContent).toBe('Inside');
});

test('the band is the documented 15% to 35% slice, and every entry rect is walked', () => {
  const above = link('above', 'Above');
  const inside = link('inside', 'Inside');
  const below = link('below', 'Below');
  const sections = new Map([
    ['above', section('above', { top: 20, bottom: 120 })],
    ['inside', section('inside', { top: 140, bottom: 200 })],
    ['below', section('below', { top: 500, bottom: 600 })],
  ]);
  const { documentRef, Observer, windowRef } = createHarness({
    links: [above, inside, below],
    sections,
    currentLabel: createFakeNode(),
    mobile: createFakeNode(),
    // Mid-page, so the band walk actually runs. At `scrollY` 0 the resolver
    // short-circuits to the first heading, which would leave every rect
    // unread and make the assertion below pass for the wrong reason.
    scrollY: 640,
  });
  const controller = buildController({ documentRef, Observer, windowRef });

  controller.pageLoad();

  expect(BAND_TOP).toBe(120);
  expect(BAND_BOTTOM).toBe(280);
  for (const node of sections.values()) {
    expect(node.rectCalls).toBeGreaterThan(0);
  }
  /*
   * `above` ends exactly ON bandTop, and the intersection test is strict
   * (`rect.bottom > bandTop`), so it is not in the band even though it does
   * qualify as the last heading above it. `inside` outranks it.
   */
  expect(above.dataset.active).toBe('false');
  expect(inside.dataset.active).toBe('true');
  expect(below.dataset.active).toBe('false');

  /* Rects are read at page-load time, so a heading moved afterwards is
   * re-resolved on the next page load. */
  sections.get('inside').setRect({ top: 900, bottom: 1000 });
  sections.get('above').setRect({ top: 100, bottom: 200 });
  controller.pageLoad();

  expect(inside.dataset.active).toBe('false');
  expect(above.dataset.active).toBe('true');
});

test('a scrolled page with nothing at or above the band leaves the list unstated', () => {
  const intro = link('intro', 'Intro');
  const currentLabel = createFakeNode();

  runPageLoad({
    links: [intro],
    sections: new Map([['intro', section('intro', { top: 900, bottom: 1000 })]]),
    currentLabel,
    mobile: createFakeNode(),
    scrollY: 640,
  });

  expect(intro.dataset.active).toBe('false');
  expect(intro.getAttribute('aria-current')).toBeNull();
  expect(currentLabel.textContent).toBe('');
});

test('a restored scroll inside the band still activates the first matched heading', () => {
  const intro = link('intro', 'Intro');
  const currentLabel = createFakeNode();

  runPageLoad({
    links: [intro],
    sections: new Map([['intro', section('intro', { top: 100, bottom: 200 })]]),
    currentLabel,
    mobile: createFakeNode(),
    scrollY: 640,
  });

  expect(intro.dataset.active).toBe('true');
  expect(currentLabel.textContent).toBe('Intro');
});

test('a digit-leading heading id resolves through the scan fallback', () => {
  const numeric = link('1-choose-one-target', 'Choose one target');
  const other = link('2-measure-first', 'Measure first');
  const currentLabel = createFakeNode();
  const sections = new Map([
    ['1-choose-one-target', section('1-choose-one-target', { top: 100, bottom: 200 })],
    ['2-measure-first', section('2-measure-first', { top: 800, bottom: 900 })],
  ]);
  const { documentRef, Observer, windowRef } = createHarness({
    links: [numeric, other],
    sections,
    currentLabel,
    mobile: createFakeNode(),
  });
  const controller = buildController({ documentRef, Observer, windowRef });

  expect(() => controller.pageLoad()).not.toThrow();
  expect(documentRef.invalidSelectorQueries).toBe(2);
  /* The throw used to escape the `astro:page-load` listener in production,
   * which left every link on its rendered `data-active="false"`. */
  expect(numeric.dataset.active).toBe('true');
  expect(other.dataset.active).toBe('false');
  expect(currentLabel.textContent).toBe('Choose one target');
});

test('replaces observers and aborts link listeners across repeated page loads', () => {
  const intro = link('intro', 'Intro');
  const sections = new Map([['intro', section('intro', { top: 100, bottom: 200 })]]);
  const { documentRef, Observer, windowRef } = createHarness({
    links: [intro],
    sections,
    currentLabel: createFakeNode(),
    mobile: createFakeNode(),
  });
  const controller = buildController({ documentRef, Observer, windowRef });

  documentRef.dispatch('astro:page-load');
  const firstObserver = Observer.instances[0];
  const firstSignal = intro.listeners[0].options.signal;
  documentRef.dispatch('astro:page-load');
  const secondObserver = Observer.instances[1];
  const secondSignal = intro.listeners[1].options.signal;

  expect(firstObserver.disconnectCalls).toBe(1);
  expect(firstSignal.aborted).toBe(true);
  expect(secondObserver).toBeDefined();
  expect(secondSignal.aborted).toBe(false);

  documentRef.dispatch('astro:before-swap');

  expect(secondObserver.disconnectCalls).toBe(1);
  expect(secondSignal.aborted).toBe(true);
  expect(controller.beforeSwap).toBeDefined();
});

test('the active label comes from the trailing heading span, not the ordinal', () => {
  const intro = link('intro', 'Intro');
  const currentLabel = createFakeNode();

  runPageLoad({
    links: [intro],
    sections: new Map([['intro', section('intro', { top: 100, bottom: 200 })]]),
    currentLabel,
    mobile: createFakeNode(),
  });

  expect(intro.lastElementChild.textContent).toBe('Intro');
  expect(intro.firstElementChild.textContent).toBe('01');
  expect(currentLabel.textContent).toBe('Intro');
  expect(currentLabel.textContent).not.toContain('01');
});
