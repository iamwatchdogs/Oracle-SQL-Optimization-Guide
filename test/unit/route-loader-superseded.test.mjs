/**
 * A superseded navigation must not settle the LIVE one.
 *
 * The router aborts navigation A and dispatches navigation B's
 * `astro:before-preparation` in the same task, so B is armed before A's aborted
 * fetch rejects on a later microtask. Astro's `defaultLoader` swallows that
 * rejection and calls `preparationEvent.preventDefault()`, so the awaited loader
 * RESOLVES with `defaultPrevented === true` — which is the path
 * `wrapRouteLoader` reports as a cancel.
 *
 * With an unscoped cancel, A's exit therefore settled B: the loader hid, the
 * reveal timers cleared, and `prepared` — the only input to the focus handoff —
 * went false. Measured in Chromium with a 300ms gap between two clicks, the
 * second navigation showed no loader at all and left `document.activeElement` on
 * `BODY` instead of `main#main`.
 *
 * These tests reproduce that ordering against the module.
 */
import { expect, test } from 'vitest';
import {
  REVEAL_DELAY_MS,
  createHarness,
  createTrackedSignal,
  visibleAttribute,
} from '../fixtures/route-loader.fixtures.mjs';

/** Two microtask turns, which is when Astro's aborted fetch settles. */
const settle = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

test('a superseded loader exit leaves the live navigation loading', async () => {
  const { controller, loader, main, timer } = createHarness();

  /* Navigation A: armed, then superseded before it can reveal. */
  const signalA = createTrackedSignal();
  controller.beforePreparation(signalA);
  expect(visibleAttribute(loader)).toBe('false');

  /* Navigation B: armed in the same task, as the router does. */
  const signalB = createTrackedSignal();
  controller.beforePreparation(signalB);

  /* B is now past the 180ms gate and is visibly loading. */
  timer.advanceTo(REVEAL_DELAY_MS);
  expect(visibleAttribute(loader)).toBe('true');
  expect(main.getAttribute('aria-busy')).toBe('true');

  /* A's loader finally resolves, and the router has already prevented the
     default because A's fetch returned null. */
  controller.cancelIfCurrent(signalA);
  await settle();

  /* B must be untouched: still loading, still busy, timers still armed. */
  expect(visibleAttribute(loader), 'B was hidden by A').toBe('true');
  expect(main.getAttribute('aria-busy'), 'B lost its busy mark').toBe('true');
  expect(timer.pending.size, 'B lost its reveal timers').toBeGreaterThan(0);
});

test('a superseded loader exit does not cancel the live focus handoff', async () => {
  const { controller, main } = createHarness();

  const signalA = createTrackedSignal();
  controller.beforePreparation(signalA);

  const signalB = createTrackedSignal();
  controller.beforePreparation(signalB);

  controller.cancelIfCurrent(signalA);
  await settle();

  /* B settles for real. The handoff is the whole point: the reader must land on
     the incoming `main`, not on the outgoing body. */
  controller.pageLoad();

  expect(main.focusCalls, 'focus handoff was swallowed by A').toHaveLength(1);
  expect(main.focusCalls[0]).toEqual({ preventScroll: true });
});

test('the live loader exit still cancels, and still drops the handoff', () => {
  const { controller, loader, main, timer } = createHarness();

  const signal = createTrackedSignal();
  controller.beforePreparation(signal);
  timer.advanceTo(REVEAL_DELAY_MS);
  expect(visibleAttribute(loader)).toBe('true');

  controller.cancelIfCurrent(signal);
  expect(visibleAttribute(loader)).toBe('false');
  expect(main.getAttribute('aria-busy')).toBeNull();

  controller.pageLoad();
  expect(main.focusCalls).toHaveLength(0);
});

test('an exit carrying no signal never cancels a live navigation', () => {
  const { controller, loader, timer } = createHarness();

  const signal = createTrackedSignal();
  controller.beforePreparation(signal);
  timer.advanceTo(REVEAL_DELAY_MS);
  expect(visibleAttribute(loader)).toBe('true');

  /* `event.signal` is always present in a real navigation, but a scoped guard
     that compares against `undefined` must not match a live signal. */
  controller.cancelIfCurrent();

  expect(visibleAttribute(loader)).toBe('true');
});

test('the abort watchdog and the scoped exit agree on the same signal', () => {
  const { controller, loader, timer } = createHarness();

  const signal = createTrackedSignal();
  controller.beforePreparation(signal);
  timer.advanceTo(REVEAL_DELAY_MS);
  expect(visibleAttribute(loader)).toBe('true');

  signal.abort();
  expect(visibleAttribute(loader)).toBe('false');
});

test('the layout wires the scoped exit, not the unscoped one', async () => {
  const { readFile } = await import('node:fs/promises');
  const { fileURLToPath } = await import('node:url');
  const path = fileURLToPath(new URL('../../src/layouts/BaseLayout.astro', import.meta.url));

  const source = await readFile(path, 'utf8');
  const wiring = source.match(/wrapRouteLoader\(\s*event\.loader,([\s\S]*?)\)\s*;/u)?.[1] ?? '';

  expect(wiring).toContain('cancelIfCurrent');
  expect(wiring).not.toMatch(/controller\.cancel\s*,/u);
});
