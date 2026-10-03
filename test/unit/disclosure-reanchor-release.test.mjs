/**
 * The re-anchor's release bookkeeping and its idempotence.
 *
 * Split from `disclosure-reanchor.test.mjs` for file length. What is asserted here
 * is only about WHO releases WHAT and WHEN, which is the half that decides whether
 * a re-anchor happens at all: the wait itself is covered there.
 */
import { describe, expect, test, vi } from 'vitest';
import { reanchorAfterSettle } from '../../src/lib/disclosure-reanchor.mjs';
import {
  createContainer,
  createFlow,
  createTarget,
  createWindow,
  fireDescendantTransition,
} from '../fixtures/disclosure-reanchor.fixtures.mjs';

/** Arm the re-anchor and hand back everything the assertions read. */
const arm = ({ reducedMotion = false, flow = createFlow(), open = true, closing = false } = {}) => {
  const windowRef = createWindow({ reducedMotion });
  const target = createTarget();
  const container = createContainer(flow, { open, closing });
  reanchorAfterSettle({ container, resolveTarget: () => target, windowRef });
  return { flow, windowRef, target };
};

describe('reanchorAfterSettle — the losers are released', () => {
  test('releases the listeners but keeps the deadline until the jump happens', () => {
    const { flow, windowRef, target } = arm({ reducedMotion: true });
    const clearTimeout = vi.spyOn(windowRef, 'clearTimeout');

    expect(windowRef.timers.size).toBe(1);
    expect(flow.attached).toBe(2);

    windowRef.runFramesUntil(() => target.calls > 0);

    expect(clearTimeout).toHaveBeenCalledOnce();
    expect(windowRef.timers.size).toBe(0);
    expect(flow.attached).toBe(0);
    expect(target.calls).toBe(1);
  });
});

describe('reanchorAfterSettle — the event trigger is released on settle', () => {
  test('releases the listeners when the transition path wins first', () => {
    const flow = createFlow({ height: 342, naturalHeight: 342 });
    const { flow: used, windowRef, target } = arm({ flow });

    used.fire('transitionend');

    expect(used.attached).toBe(0);
    expect(target.calls, 'the release happens before the jump, not after').toBe(0);
    /*
     * The deadline is still armed here on purpose. The height wait runs on
     * `requestAnimationFrame`, which can be starved indefinitely on a loaded
     * machine, and an earlier version cleared this timer on the first trigger —
     * leaving the re-anchor with no timer-based way to happen at all.
     */
    expect(windowRef.timers.size, 'the only timer-based backstop was released early').toBe(1);

    windowRef.runFramesUntil(() => target.calls > 0);
    expect(target.calls).toBe(1);
  });

  test('a starved frame loop still re-aims, on the deadline alone', () => {
    /*
     * The failure this guards: measured under a load average of 50, the mobile TOC
     * gate failed every attempt while passing 6 of 6 in isolation. Nothing about the
     * page changed between those runs — the frame loop simply stopped delivering.
     */
    const flow = createFlow({ height: 342, naturalHeight: 342 });
    const { flow: used, windowRef, target } = arm({ flow });

    used.fire('transitionend');
    /* No frames run at all between the event and the deadline. */
    windowRef.runTimers();

    expect(target.calls).toBe(1);
    /* The deadline leaves its correction backstops armed, not nothing: a starved
     * frame loop also starves the height wait, so the first jump can have scrolled
     * against a collapse that has not finished moving the page. */
    windowRef.runTimers();
    windowRef.runTimers();
    expect(windowRef.timers.size).toBe(0);
  });
});

describe('reanchorAfterSettle — the jump is idempotent', () => {
  test('a starved frame loop re-aims a no-flow container too', () => {
    const { windowRef, target } = arm({ flow: null });

    windowRef.runTimers();
    expect(target.calls).toBe(1);
  });
});

describe('reanchorAfterSettle — event handling', () => {
  test('ignores a descendant transition that bubbles up to the flow', () => {
    const flow = createFlow({ height: 0, naturalHeight: 342 });
    const { windowRef, target } = arm({ flow });

    fireDescendantTransition(flow);
    flow.setHeight(120);
    windowRef.runFrames();

    expect(target.calls, 'a descendant transition triggered the re-anchor').toBe(0);
  });

  test('survives a container with no window at all', () => {
    const flow = createFlow({ height: 0, naturalHeight: 342 });
    const target = createTarget();

    expect(() =>
      reanchorAfterSettle({
        container: createContainer(flow),
        resolveTarget: () => target,
        windowRef: {},
      }),
    ).not.toThrow();
  });
});
