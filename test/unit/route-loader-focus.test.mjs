import { expect, test } from 'vitest';
import {
  createHarness,
  REVEAL_DELAY_MS,
  visibleAttribute,
} from '../fixtures/route-loader.fixtures.mjs';

/*
 * The focus handoff, isolated from the reveal mechanics in
 * `route-loader.test.mjs`.
 *
 * `pending` and `prepared` are separate flags on purpose. `pending` gates the
 * reveal, the busy mark and the safety cap. `prepared` records that a
 * client-side navigation actually started, and is the ONLY input to the focus
 * handoff in `pageLoad`.
 *
 * `astro:before-swap` fires BEFORE `astro:page-load`, so a before-swap handler
 * that called the full `cancel()` discarded `prepared` and the handoff silently
 * never ran — focus stayed on the outgoing body after every navigation. The
 * handler therefore calls `beforeSwap()`, which settles the visuals only.
 */
test('beforeSwap hides the loader but preserves the focus-handoff flag', () => {
  const { controller, loader, main, message, timer } = createHarness();

  controller.beforePreparation();
  timer.advanceTo(REVEAL_DELAY_MS);
  expect(visibleAttribute(loader)).toBe('true');

  controller.beforeSwap();
  expect(visibleAttribute(loader)).toBe('false');
  expect(message.textContent).toBe('');
  expect(main.getAttribute('aria-busy')).toBeNull();

  /*
   * The handoff must still happen. `astro:before-swap` fires BEFORE
   * `astro:page-load`, so a handler that cleared the "a navigation was prepared"
   * flag left focus on the outgoing body after every navigation — the focus
   * handoff silently never ran.
   */
  controller.pageLoad();
  expect(main.focusCalls).toHaveLength(1);
  expect(main.focusCalls[0]).toEqual({ preventScroll: true });
});

test('cancel does discard the focus-handoff flag', () => {
  const { controller, main } = createHarness();

  controller.beforePreparation();
  controller.cancel();
  controller.pageLoad();
  expect(main.focusCalls).toHaveLength(0);
});
