import { describe, expect, test } from 'vitest';
import {
  buildController,
  createFakeNode,
  createHarness,
} from '../fixtures/reading-toc.fixtures.mjs';

/*
 * The scroll-spy's behaviour at the two ends of the document, and the guarantee
 * that the highlight tracks the scroll POSITION rather than only the
 * IntersectionObserver.
 *
 * Split out of `reading-toc-controller.test.mjs`, which covers the band
 * arithmetic; this file covers what happens outside the band.
 */
const VIEWPORT = 800;
const BAND_TOP = VIEWPORT * 0.15;
const BAND_BOTTOM = VIEWPORT * 0.35;

const link = (id, text) => createFakeNode({ dataset: { tocLink: id, active: 'false' }, text });
const section = (id, rect) => createFakeNode({ id, rect });
const at = (top, bottom = top + 100) => ({ top, bottom });
const inBand = () => at(BAND_TOP + 10, BAND_BOTTOM - 10);

/** A two-section article scrolled to `scrollY` on a `maxScroll`-tall page. */
function setup({ scrollY, maxScroll, first, second }) {
  const links = [link('first', 'First'), link('second', 'Second')];
  const sections = new Map([
    ['first', section('first', first)],
    ['second', section('second', second)],
  ]);
  const { documentRef, Observer, windowRef } = createHarness({
    links,
    sections,
    currentLabel: createFakeNode(),
    mobile: createFakeNode(),
    scrollY,
    maxScroll,
  });
  buildController({ documentRef, Observer, windowRef }).pageLoad();
  return { links, sections, windowRef, first: links[0], second: links[1] };
}

describe('reading toc — scroll spy at the document edges', () => {
  test('at the top the first section is current, even when it is below the band', () => {
    const { first, second } = setup({
      scrollY: 0,
      maxScroll: 4000,
      first: at(900, 1000),
      second: at(1400, 1500),
    });

    expect(first.dataset.active).toBe('true');
    expect(second.dataset.active).toBe('false');
  });

  test('at the bottom the LAST section is current, not the first', () => {
    /*
     * Regression. The spy was driven entirely by IntersectionObserver, which
     * only fires when the SET of intersecting elements changes. With the band at
     * 15%-35% the bottom of a page can leave it empty: the previous heading
     * leaves the band while the last heading sits below it. The callback then ran
     * with nothing visible, so no id was applied and the highlight stayed where
     * load had left it — the FIRST section. A reader who scrolled to the end of
     * a chapter was told they were at the beginning of it.
     */
    const { first, second } = setup({
      scrollY: 4000,
      maxScroll: 4000,
      first: at(-900, -800),
      second: at(400, 500),
    });

    expect(first.dataset.active).toBe('false');
    expect(second.dataset.active).toBe('true');
    expect(second.getAttribute('aria-current')).toBe('location');
  });

  test('above the first heading no section is current', () => {
    const { first } = setup({
      scrollY: 640,
      maxScroll: 4000,
      first: at(900, 1000),
      second: at(1400, 1500),
    });

    // Naming a section the reader has not reached is worse than naming none.
    expect(first.dataset.active).toBe('false');
    expect(first.getAttribute('aria-current')).toBeNull();
  });
});

describe('reading toc — scroll spy tracks position, not just observer callbacks', () => {
  test('a scroll moves the highlight even though the observer never fires', () => {
    /*
     * `IntersectionObserver` callbacks are asynchronous, so a spy listening only
     * to them lags the scroll. The controller also recomputes on a passive,
     * rAF-coalesced scroll listener.
     */
    const { first, second, sections, windowRef } = setup({
      scrollY: 0,
      maxScroll: 4000,
      first: at(20, 120),
      second: inBand(),
    });
    expect(first.dataset.active).toBe('true');

    sections.get('first').getBoundingClientRect = () => at(-900, -800);
    sections.get('second').getBoundingClientRect = () => at(140, 200);
    windowRef.scrollY = 1000;
    windowRef.dispatchEvent('scroll');

    // Coalesced: nothing moves until the frame runs.
    expect(first.dataset.active).toBe('true');
    windowRef.runAnimationFrames();

    expect(first.dataset.active).toBe('false');
    expect(second.dataset.active).toBe('true');
  });

  test('a burst of scroll events costs one measurement, not one per event', () => {
    const { sections, windowRef, second } = setup({
      scrollY: 0,
      maxScroll: 4000,
      first: at(20, 120),
      second: at(400, 500),
    });

    sections.get('second').getBoundingClientRect = () => inBand();
    for (let i = 1; i <= 5; i += 1) {
      windowRef.scrollY = 1000 + i;
      windowRef.dispatchEvent('scroll');
    }

    // Measuring every heading on each of five events is the cost this avoids.
    expect(windowRef.pendingFrames()).toBe(1);
    windowRef.runAnimationFrames();
    expect(windowRef.pendingFrames()).toBe(0);
    expect(second.dataset.active).toBe('true');
  });
});
