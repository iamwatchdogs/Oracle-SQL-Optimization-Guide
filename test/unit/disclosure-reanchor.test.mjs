/**
 * The re-anchor's settle arbitration.
 *
 * The module's job is choosing WHEN to re-aim the viewport, and its failure mode
 * is a re-anchor that fires while the disclosure is still resizing. So the tests
 * assert the arbitration directly:
 *
 * - with motion allowed, the next-frame path must NOT be armed, because a frame
 *   is ~16ms into a 280ms transition;
 * - under reduced motion it is the only available path and must be armed;
 * - whatever triggers the settle, the JUMP waits until the row's measured height
 *   has stopped changing — the property the caller needs, measured rather than
 *   inferred from an event about a CSS property;
 * - the first trigger to fire releases the others.
 *
 * The doubles live in `test/fixtures/disclosure-reanchor.fixtures.mjs`.
 */
import { describe, expect, test } from 'vitest';
import { reanchorAfterSettle } from '../../src/lib/disclosure-reanchor.mjs';
import {
  createContainer,
  createFlow,
  createTarget,
  createWindow,
} from '../fixtures/disclosure-reanchor.fixtures.mjs';

/** Arm the re-anchor and hand back everything the assertions read. */
const arm = ({ reducedMotion = false, flow = createFlow(), open = true, closing = false } = {}) => {
  const windowRef = createWindow({ reducedMotion });
  const target = createTarget();
  const container = createContainer(flow, { open, closing });
  reanchorAfterSettle({ container, resolveTarget: () => target, windowRef });
  return { flow, windowRef, target };
};

describe('reanchorAfterSettle — which paths are armed', () => {
  test('does not arm the next-frame path while the row can still animate', () => {
    const { flow, windowRef, target } = arm();

    /*
     * The old code scheduled this unconditionally, so the frame always won and
     * the transition path never ran. Instrumented in Chromium at 390x844: a TOC
     * link click issued `scrollIntoView` 57ms later, while the panel was still
     * at its full 733px, and the genuine `transitionend` at +341ms was discarded.
     */
    expect(windowRef.frames).toHaveLength(0);
    expect(flow.attached).toBe(2);

    windowRef.runFrames();
    expect(target.calls).toBe(0);
  });

  test('arms the next-frame path under reduced motion, where nothing else can fire', () => {
    const { flow, windowRef, target } = arm({ reducedMotion: true });

    expect(windowRef.frames).toHaveLength(1);

    windowRef.runFramesUntil(() => target.calls > 0);
    expect(target.calls).toBe(1);

    /* A transition, if one ever did arrive, must be inert. */
    flow.fire('transitionend');
    expect(target.calls).toBe(1);
  });

  test('falls back to the next frame when there is no flow at all', () => {
    const { windowRef, target } = arm({ flow: null });

    expect(windowRef.frames).toHaveLength(1);
    windowRef.runFramesUntil(() => target.calls > 0);
    expect(target.calls).toBe(1);
  });

  test('the timeout still forces the re-anchor on a row that never settles', () => {
    const { windowRef, target } = arm();

    /* A row still changing height at 400ms: the frame loop has not converged, so
     * the hard bound has to produce the jump on its own. */
    windowRef.runTimers();
    expect(target.calls).toBe(1);
  });
});

describe('reanchorAfterSettle — a mid-grow event does not re-anchor', () => {
  test('waits out the growth instead of jumping on the event', () => {
    const flow = createFlow({ height: 0, naturalHeight: 342 });
    const { windowRef, target } = arm({ flow });

    flow.fire('transitionend');
    flow.setHeight(120);
    windowRef.runFrames();
    expect(target.calls, 're-anchored while the row was still growing').toBe(0);

    flow.setHeight(342);
    windowRef.runFramesUntil(() => target.calls > 0);
    expect(target.calls).toBe(1);
  });
});

describe('reanchorAfterSettle — the natural height, not a plateau', () => {
  test('a plateau partway through the transition does not fool the wait', () => {
    /*
     * The real failure. WebKit's evidence key growth parks at 336px for several
     * frames while still 6px short of its end, so a "height did not change"
     * heuristic converges early and the re-anchor lands 211px off. Comparing
     * against the row's natural height cannot be fooled that way.
     */
    const flow = createFlow({ height: 0, naturalHeight: 342 });
    const { windowRef, target } = arm({ flow });

    flow.fire('transitionend');

    for (const height of [336, 338]) {
      flow.setHeight(height);
      windowRef.runFrames(12);
      expect(target.calls, `re-anchored at ${height}px, short of the natural height`).toBe(0);
    }

    flow.setHeight(342);
    windowRef.runFramesUntil(() => target.calls > 0);
    expect(target.calls).toBe(1);
  });
});

describe('reanchorAfterSettle — a row that is already done', () => {
  test('a row a fraction under its natural height counts as done', () => {
    /*
     * `grid-template-rows: 0fr -> 1fr` lands a fraction of a pixel short of the
     * content's natural height, so an exact comparison would never fire and every
     * re-anchor would fall through to the deadline.
     */
    const flow = createFlow({ height: 0, naturalHeight: 342 });
    const { windowRef, target } = arm({ flow });

    flow.fire('transitionend');
    flow.setHeight(341.5);
    windowRef.runFramesUntil(() => target.calls > 0);

    expect(target.calls).toBe(1);
  });

  test('a fully open row jumps without waiting for the deadline', () => {
    const flow = createFlow({ height: 342, naturalHeight: 342 });
    const { windowRef, target } = arm({ flow });

    flow.fire('transitionend');
    windowRef.runFramesUntil(() => target.calls > 0);

    expect(target.calls).toBe(1);
    expect(windowRef.timers.size, 'the deadline was released too').toBe(0);
  });

  test('a row with no content to grow into is already at its end', () => {
    const flow = createFlow({ height: 0, naturalHeight: 0 });
    const { windowRef, target } = arm({ flow });

    flow.fire('transitionend');
    windowRef.runFramesUntil(() => target.calls > 0);

    expect(target.calls).toBe(1);
  });
});

describe('reanchorAfterSettle — a row on its way closed', () => {
  /*
   * The mobile TOC's case, and the one a single-direction criterion gets wrong.
   *
   * A collapsing row is `grid-template-rows: 0fr`, where `scrollHeight` tracks the
   * CURRENT interpolated height. So "height has reached its natural height" is
   * true on the first frame of the collapse, and a re-anchor that waited on it
   * fired while the panel was still 700px tall — leaving the reader aimed at a
   * heading that was still travelling down the page.
   */
  test('waits for the row to reach zero, not for its shrinking natural height', () => {
    const flow = createFlow({ height: 733, naturalHeight: 733 });
    const { windowRef, target } = arm({ flow, open: false });

    flow.fire('transitionend');
    windowRef.runFrames(12);
    expect(target.calls, 're-anchored while the panel was still 733px tall').toBe(0);

    flow.setHeight(400);
    windowRef.runFrames(12);
    expect(target.calls, 're-anchored mid-collapse').toBe(0);

    flow.setHeight(0.5);
    windowRef.runFramesUntil(() => target.calls > 0);
    expect(target.calls).toBe(1);
  });

  test('honours the controller closing flag even while `open` is still set', () => {
    const flow = createFlow({ height: 733, naturalHeight: 733 });
    const { windowRef, target } = arm({ flow, open: true, closing: true });

    flow.fire('transitionend');
    flow.setHeight(600);
    windowRef.runFrames(6);
    expect(target.calls, 'a closing row was treated as still opening').toBe(0);
  });

  test('a reduced-motion collapse jumps at once, since nothing is animating', () => {
    const flow = createFlow({ height: 0, naturalHeight: 733 });
    const { windowRef, target } = arm({ flow, open: false, reducedMotion: true });

    windowRef.runFramesUntil(() => target.calls > 0);
    expect(target.calls).toBe(1);
  });
});

describe('reanchorAfterSettle — the wait is bounded', () => {
  test('a row that never reaches its natural height is still bounded', () => {
    const flow = createFlow({ height: 0, naturalHeight: 342 });
    const { windowRef, target } = arm({ flow });

    flow.fire('transitionend');
    windowRef.runFrames(40);
    expect(target.calls, 'a row stuck mid-grow must still be re-anchored').toBe(1);
  });

  test('the bound is wall-clock, not a frame count', () => {
    /*
     * A frame-count bound is display-rate dependent: 20 frames is 333ms at 60Hz
     * but only 166ms at 120Hz, which would cut the wait short of a 280ms
     * transition on a fast display. Advancing the clock past the deadline in a
     * single frame must end the wait regardless of how few frames it took.
     */
    const flow = createFlow({ height: 0, naturalHeight: 342 });
    const { windowRef, target } = arm({ flow });

    flow.fire('transitionend');
    /* The wait starts on its first frame, so the clock is read from there. */
    windowRef.runFrame(16);
    windowRef.runFrame(500);

    expect(target.calls).toBe(1);
  });
});
