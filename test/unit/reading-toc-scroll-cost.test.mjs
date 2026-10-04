import { expect, test } from 'vitest';
import {
  IN_VIEWPORT_HEIGHT,
  buildController,
  createFakeNode,
  createHarness,
} from '../fixtures/reading-toc.fixtures.mjs';

/*
 * What the scroll spy COSTS per frame, as distinct from what it decides.
 *
 * `sync` in `observeSections` (`reading-toc-controller.mjs:149`) took three reads
 * per frame, and one of them is `documentElement.scrollHeight`. That is a
 * layout-flushing property: Blink answers it by running style recalc and layout for
 * the WHOLE document, synchronously, inside the handler. The spy is rAF-coalesced
 * to one sync per frame, so a thumb-drag costs one forced full-document layout on
 * every frame of it. The `inputsChanged` guard cannot help: it compares
 * `scrollHeight` AND `scrollY`, and `scrollY` changes on every frame by
 * definition, so the guard is true on every frame — and the flush has already
 * happened by the time it is consulted.
 *
 * The second defect is the tail. `html { scroll-behavior: smooth }` is set
 * project-wide, so a click on any of the 38 in-page outline anchors starts a
 * browser-driven smooth scroll lasting hundreds of milliseconds, and the spy
 * re-measures all 42 headings on every frame of it even though the active heading
 * only changes at heading boundaries. Nothing in the codebase listens for
 * `scrollend`, so no signal ever tells the spy the scroll is over.
 *
 * Three headings, 1200px apart in DOCUMENT space, which is what keeps the geometry
 * honest: `rect.top` is `documentTop - scrollY`, so the band walks down the page as
 * the reader does. `maxScroll` is 4000 against a 2400px walk, so the page-bottom
 * case in `resolveActiveId` never fires and none of the numbers below is an
 * artefact of it.
 */

const HEADING_STEP = 1200;
const HEADING_HEIGHT = 100;
const FRAMES = 24;
const STEP_PX = 100;
const HEADINGS = [
  ['intro', 'Intro'],
  ['middle', 'Middle'],
  ['later', 'Later'],
];

/*
 * `createHarness` builds `documentElement` as a plain object literal, so its
 * `scrollHeight` swaps for a counting getter without touching the shared fixture.
 */
function countScrollHeightReads(documentRef, scrollHeight) {
  const probe = { reads: 0 };
  Object.defineProperty(documentRef.documentElement, 'scrollHeight', {
    configurable: true,
    get() {
      probe.reads += 1;
      return scrollHeight;
    },
  });
  return probe;
}

/*
 * The window fake's `addEventListener` IS `createEventTarget.add`, whose signature
 * is `(type, handler)` — the third argument is dropped on the floor. So nothing on
 * the fake can be asked what the controller registered, and reading `options.passive`
 * off it is impossible without editing `reading-toc-window.fixtures.mjs`, a file
 * seven other specs import. `createEventTarget` is module-private, so wrapping the
 * fake's own method is the only route to the answer that leaves the fixture alone.
 */
function recordWindowListeners(windowRef) {
  const calls = [];
  const add = windowRef.addEventListener;
  windowRef.addEventListener = (type, handler, options) => {
    calls.push({ type, options });
    add(type, handler, options);
  };
  return calls;
}

const rectReads = (sections) =>
  [...sections.values()].reduce((total, node) => total + node.rectCalls, 0);

const activeOf = (links) =>
  links.find((link) => link.dataset.active === 'true')?.dataset.tocLink ?? null;

/** Set the position, dispatch, and flush exactly one frame. */
const scrollTo = (windowRef, scrollY) => {
  windowRef.scrollY = scrollY;
  windowRef.dispatchEvent('scroll');
  windowRef.runAnimationFrames();
};

/*
 * One frame per position, recording the highlight after each. The trace is the only
 * way to show WHERE a boundary was crossed rather than just that the final position
 * resolved to the right heading.
 */
function walkFrames({ windowRef, active, frames = FRAMES, step = STEP_PX }) {
  const trace = [];
  for (let index = 0; index < frames; index += 1) {
    scrollTo(windowRef, (index + 1) * step);
    trace.push(active());
  }
  return trace;
}

function open({ scrollY = 0, maxScroll = 4000 } = {}) {
  const links = HEADINGS.map(([id, text]) =>
    createFakeNode({ dataset: { tocLink: id, active: 'false' }, text }),
  );
  const sections = new Map(HEADINGS.map(([id]) => [id, createFakeNode({ id })]));
  const harness = createHarness({
    links,
    sections,
    currentLabel: createFakeNode(),
    mobile: createFakeNode(),
    scrollY,
    maxScroll,
  });
  const { documentRef, Observer, windowRef } = harness;

  /*
   * Each rect is DERIVED from `scrollY` instead of moved by hand, so the fixture's
   * own `rectCalls` counter still sees every read. Overwriting the probe outright
   * would have dropped the increment and every count below would read zero.
   */
  for (const [index, [id]] of HEADINGS.entries()) {
    const node = sections.get(id);
    const documentTop = index * HEADING_STEP;
    node.getBoundingClientRect = () => {
      node.rectCalls += 1;
      return {
        top: documentTop - windowRef.scrollY,
        bottom: documentTop + HEADING_HEIGHT - windowRef.scrollY,
      };
    };
  }

  const scrollHeight = countScrollHeightReads(documentRef, IN_VIEWPORT_HEIGHT + maxScroll);
  const listeners = recordWindowListeners(windowRef);

  buildController({ documentRef, Observer, windowRef }).pageLoad();

  return { ...harness, links, sections, listeners, scrollHeight, active: () => activeOf(links) };
}

test('a scroll burst does not re-read document scrollHeight once per frame', () => {
  const { active, scrollHeight, windowRef } = open();

  /*
   * The bound is O(1) in the burst, not O(frames), and it has to be: ANY per-frame
   * read of `scrollHeight` is a forced full-document layout, so a fix that reads it
   * once per frame has not removed the cost at all — it has only moved the read.
   * Meeting the bound means the scroll path does not consult the property and the
   * page-bottom case reuses a value obtained outside it. Reading it once per
   * RESOLVED-ID change (2 here: `intro` -> `middle` -> `later`) would also pass a
   * `<= 2` bound, but 24 frames and 2 changes is not a bound worth asserting, so
   * the strict one is used and the page load's single read is excluded by
   * snapshotting the counter after it.
   */
  const beforeBurst = scrollHeight.reads;
  const trace = walkFrames({ windowRef, active });

  expect(scrollHeight.reads - beforeBurst).toBeLessThanOrEqual(1);

  // And the id still moved, twice, on the way: cost-only, never behaviour.
  expect([...new Set(trace)]).toEqual(['intro', 'middle', 'later']);
  expect(active()).toBe('later');
  expect(windowRef.pendingFrames()).toBe(0);
});

test('the spy parks on scrollend and re-arms when the reader moves again', () => {
  const { active, sections, windowRef } = open();

  scrollTo(windowRef, 1000);
  expect(active()).toBe('middle');

  /*
   * Both halves are load-bearing and they point opposite ways. A spy that parked
   * forever passes the first and fails the second; a spy with no park at all passes
   * the second and fails the first.
   */
  const parked = rectReads(sections);
  windowRef.dispatchEvent('scrollend');

  windowRef.dispatchEvent('scroll');

  /*
   * THE discriminating line. A position that has not moved since the scroll ended
   * is not a reason to queue a frame at all: the old code queued one and only bailed
   * out inside it, and a queued frame is work the browser still has to schedule. If
   * the fix parks inside `sync` instead of at the handler, delete this one
   * assertion — this test is then green before the fix too, because `inputsChanged`
   * already suppresses a sync whose position has not moved.
   */
  expect(windowRef.pendingFrames()).toBe(0);
  windowRef.runAnimationFrames();

  // Several more events at the same position: still nothing to re-measure.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    windowRef.dispatchEvent('scroll');
    windowRef.runAnimationFrames();
  }
  expect(rectReads(sections)).toBe(parked);
  expect(active()).toBe('middle');

  // A real move has to wake it, or the highlight dies at the next boundary.
  scrollTo(windowRef, 2200);
  expect(active()).toBe('later');
  expect(rectReads(sections)).toBeGreaterThan(parked);
});

test('the scroll listener is passive and a synchronous burst still coalesces to one frame', () => {
  const { listeners, windowRef } = open();

  /*
   * `passive: true` is what lets the compositor keep scrolling while the handler
   * runs, and it is invisible in the rendered output — the only instrument is the
   * registration itself, which is why the recorder above exists.
   */
  const scrollListener = listeners.find((call) => call.type === 'scroll');
  expect(scrollListener).toBeDefined();
  expect(scrollListener.options?.passive).toBe(true);

  // Ten scroll events in a single turn is one measurement, not ten.
  for (let index = 1; index <= 10; index += 1) {
    windowRef.scrollY = index * STEP_PX;
    windowRef.dispatchEvent('scroll');
  }

  expect(windowRef.pendingFrames()).toBe(1);
  windowRef.runAnimationFrames();
  expect(windowRef.pendingFrames()).toBe(0);
});

test('the highlight still crosses both heading boundaries one frame at a time', () => {
  const { active, windowRef } = open();

  /*
   * The non-regression, and the only test here that must be green on BOTH sides of
   * the fix: it pins the exact `scrollY` either side of each boundary, so a cost
   * change that quietly became a behaviour change — an off-by-one in the band, a
   * dropped `lastAbove` fallback — fails one of these six rather than the last one.
   */
  expect(active()).toBe('intro');
  expect(windowRef.scrollY).toBe(0);

  // `middle` is at 300..400, below the 120..280 band.
  scrollTo(windowRef, 900);
  expect(active()).toBe('intro');

  // 200..300 lands inside the band.
  scrollTo(windowRef, 1000);
  expect(active()).toBe('middle');

  // Out of the band, but `lastAbove` keeps it current.
  scrollTo(windowRef, 1200);
  expect(active()).toBe('middle');

  // `later` is at 300..400, below the band.
  scrollTo(windowRef, 2100);
  expect(active()).toBe('middle');

  scrollTo(windowRef, 2200);
  expect(active()).toBe('later');

  // Above the band again, and still the heading being read.
  scrollTo(windowRef, 2400);
  expect(active()).toBe('later');
});
