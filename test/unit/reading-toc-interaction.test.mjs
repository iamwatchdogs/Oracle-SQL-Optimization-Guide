import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import {
  buildController,
  createFakeNode,
  createHarness,
} from '../fixtures/reading-toc.fixtures.mjs';

const readSource = (relativePath) => readFile(new URL(relativePath, import.meta.url), 'utf8');

/*
 * The re-anchor waits for the collapse to settle, so a test has to drive the
 * settling signals itself. Both queues live on the fake WINDOW, not the global,
 * so they are driven through the harness.
 */
const settle = ({ flow, windowRef }, { runFrames = true } = {}) => {
  if (flow) {
    flow.dispatch('transitionend');
  }
  if (runFrames) {
    windowRef.runAnimationFrames();
  }
  windowRef.runTimers();
};

function jumpHarness({ mobileOpen }) {
  const intro = createFakeNode({ dataset: { tocLink: 'intro' }, text: 'Intro' });
  const target = createFakeNode({ id: 'intro', rect: { top: 100, bottom: 200 } });
  const flow = createFakeNode();
  const mobile = createFakeNode({ querySelector: () => flow });
  mobile.open = mobileOpen;
  const harness = createHarness({
    links: [intro],
    sections: new Map([['intro', target]]),
    currentLabel: createFakeNode(),
    mobile,
  });
  const controller = buildController(harness);

  controller.pageLoad();
  intro.dispatch('click');

  return { ...harness, controller, flow, intro, mobile, target };
}

test('closing the mobile panel re-runs the jump once the collapse settles', () => {
  const harness = jumpHarness({ mobileOpen: true });

  expect(harness.mobile.open).toBe(false);
  /*
   * The mobile panel sits above the article in the grid, so collapsing it
   * animates `grid-template-rows` over 280ms and shifts everything below it
   * upward — after the router has already scrolled to the target. Re-anchoring
   * one frame in is too early: it measures a panel that is still 200ms from
   * finishing, so the reader lands ~100px above the heading.
   */
  expect(harness.target.scrollCalls).toEqual([]);

  settle(harness);

  expect(harness.target.scrollCalls).toEqual([{ block: 'start', behavior: 'instant' }]);
});

test('the re-anchor is idempotent: later settles do not scroll again', () => {
  const harness = jumpHarness({ mobileOpen: true });

  settle(harness);
  expect(harness.target.scrollCalls).toHaveLength(1);

  /*
   * All three settling paths have now fired. The later ones are too late to
   * matter and must not move the reader a second time, which would undo the
   * correction they exist to provide.
   */
  settle(harness);
  settle(harness, { runFrames: false });

  expect(harness.target.scrollCalls).toHaveLength(1);
});

test('the next-frame path fires with a flow present, under reduced motion', () => {
  /*
   * Regression, and the reason the fixture now passes a timestamp.
   *
   * The frame path used to share one guard with the transition-event path:
   *
   *     const settle = (event) => {
   *       if (settled || (event && event.target !== flow)) return;
   *       ...
   *     };
   *     requestAnimationFrame(settle);
   *
   * A browser calls that callback with a `DOMHighResTimeStamp` — a number — so
   * `event` was truthy, `event.target` was `undefined`, and the guard rejected
   * its own frame path. Under `prefers-reduced-motion: reduce` the row is
   * `transition: none`, so no `transitionend` ever fires and the 400ms timeout
   * was the only surviving path: reduced-motion readers got a ~400ms window
   * where the article was mis-aimed.
   *
   * The fixture made it look correct by invoking frame callbacks with NO
   * argument, so `event` was `undefined` and the guard passed. It now passes a
   * timestamp, and this test drives the flow-present frame path that no test
   * previously exercised.
   */
  const harness = jumpHarness({ mobileOpen: true });
  expect(harness.flow).toBeTruthy();

  // No transition event: this is the reduced-motion case exactly.
  harness.windowRef.runAnimationFrames();

  expect(harness.target.scrollCalls).toEqual([{ block: 'start', behavior: 'instant' }]);
});

test("a descendant's transitionend does not settle the re-anchor", () => {
  const harness = jumpHarness({ mobileOpen: true });
  const child = createFakeNode();

  // A nested element's transitionend bubbles to the flow's listener. Ending the
  // window there would re-anchor while the panel is still growing.
  child.dispatch('transitionend');
  harness.windowRef.runAnimationFrames();
  harness.windowRef.runTimers();

  expect(harness.target.scrollCalls).toHaveLength(1);
});

test('a panel with no flow still re-anchors on the next frame', () => {
  const target = createFakeNode({ id: 'intro', rect: { top: 100, bottom: 200 } });
  const intro = createFakeNode({ dataset: { tocLink: 'intro' }, text: 'Intro' });
  const mobile = createFakeNode({ querySelector: () => null });
  mobile.open = true;
  const harness = createHarness({
    links: [intro],
    sections: new Map([['intro', target]]),
    currentLabel: createFakeNode(),
    mobile,
  });
  buildController(harness).pageLoad();
  intro.dispatch('click');
  harness.windowRef.runAnimationFrames();

  expect(target.scrollCalls).toEqual([{ block: 'start', behavior: 'instant' }]);
});

test('a collapsed panel schedules no re-scroll', () => {
  const { target, windowRef } = jumpHarness({ mobileOpen: false });

  expect(windowRef.pendingFrames()).toBe(0);
  expect(windowRef.pendingTimers()).toBe(0);
  expect(target.scrollCalls).toEqual([]);
});

test('keeps the mobile current-section text out of live announcements', async () => {
  const source = await readSource('../../src/components/ReadingToc.astro');

  expect(source).toContain('data-toc-mobile-current');
  expect(source).not.toContain('aria-live');
});

test('the ordinal is hidden from the accessibility tree so the link name is the heading', async () => {
  const source = await readSource('../../src/components/ReadingToc.astro');
  const ordinal = source.match(/<span class=\{tocNumClass\}[^>]*>/gu) ?? [];
  const labels = source.match(/<span class="min-w-0[^"]*">\{h\.text\}<\/span>/gu) ?? [];

  /* One ordinal per rendered list: the desktop nav and the mobile nav. */
  expect(ordinal).toHaveLength(2);
  for (const span of ordinal) {
    expect(span).toContain('aria-hidden="true"');
  }
  expect(labels).toHaveLength(2);
  for (const span of labels) {
    expect(span).not.toContain('aria-hidden');
  }
  /* `aria-label` duplicated the visible text and desynchronised the moment the
   * ordinal was announced alongside it. */
  expect(source).not.toContain('aria-label={h.text}');
});
