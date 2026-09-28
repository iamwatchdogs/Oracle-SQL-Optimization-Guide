import { expect, test } from 'vitest';
import {
  FakeElement,
  MAX_VISIBLE_MS,
  REVEAL_DELAY_MS,
  createHarness,
  createTrackedSignal,
  visibleAttribute,
} from '../fixtures/route-loader.fixtures.mjs';

test('exposes the native hooks and the two cancellation scopes', () => {
  const { controller } = createHarness();

  /* `cancelIfCurrent` is the signal-scoped exit; see `test/unit/route-loader-superseded.test.mjs`. */
  expect(Object.keys(controller).toSorted()).toEqual([
    'beforePreparation',
    'beforeSwap',
    'cancel',
    'cancelIfCurrent',
    'pageLoad',
  ]);
});

test('before preparation delays the loader and publishes a fresh message', () => {
  const { controller, loader, main, message, timer } = createHarness();
  const signal = new AbortController();

  controller.beforePreparation(signal.signal);

  /*
   * `aria-busy` moved INSIDE the reveal gate. Marking it synchronously meant a
   * fast cached navigation produced a busy state with no visible feedback at
   * all, because the loader never became visible before the swap landed.
   */
  expect(main.hasAttribute('aria-busy')).toBe(false);
  expect(visibleAttribute(loader)).toBe('false');
  expect(message.textContent).toBe('');
  /* Two timers: the reveal gate and the hard cap. */
  expect(timer.pending.size).toBe(2);
  expect([...timer.pending.values()].map((entry) => entry.delay).toSorted()).toEqual([
    REVEAL_DELAY_MS,
    MAX_VISIBLE_MS,
  ]);

  timer.advanceTo(REVEAL_DELAY_MS - 1);
  expect(visibleAttribute(loader)).toBe('false');
  expect(main.hasAttribute('aria-busy')).toBe(false);

  timer.advanceTo(REVEAL_DELAY_MS);
  expect(visibleAttribute(loader)).toBe('true');
  expect(message.textContent).toBe('Loading requested page');
  expect(main.getAttribute('aria-busy')).toBe('true');
});

test('the 8s cap cancels a navigation that never reaches page load', () => {
  const { controller, loader, main, message, timer } = createHarness();
  const signal = new AbortController();

  controller.beforePreparation(signal.signal);
  timer.advanceTo(REVEAL_DELAY_MS);

  expect(visibleAttribute(loader)).toBe('true');
  expect(main.getAttribute('aria-busy')).toBe('true');

  /*
   * Astro's default route loader has no timeout and no try/catch, so a stalled
   * connection leaves the transition promise unsettled and `astro:page-load`
   * is never dispatched. Without a cap the loader, its `role="status"` live
   * region and `aria-busy` on `<main>` stay up with no code path back.
   */
  timer.advanceTo(MAX_VISIBLE_MS);
  /* `pageLoad` deliberately never runs. */

  expect(visibleAttribute(loader)).toBe('false');
  expect(message.textContent).toBe('');
  expect(main.hasAttribute('aria-busy')).toBe(false);
  expect(timer.pending.size).toBe(0);
  /* Focus is a page-load responsibility; the cap must not steal it. */
  expect(main.focusCalls).toEqual([]);
});

test('a fast page load clears state without showing the loader', () => {
  const { controller, loader, main, message, timer, window } = createHarness();
  const signal = new AbortController();

  controller.beforePreparation(signal.signal);
  const [timerId] = timer.pending.keys();
  controller.pageLoad();
  timer.run(timerId);

  expect(visibleAttribute(loader)).toBe('false');
  expect(message.textContent).toBe('');
  expect(main.hasAttribute('aria-busy')).toBe(false);
  /* Both the reveal gate and the cap are cleared by the same `clear()`. */
  expect(timer.pending.size).toBe(0);
  expect(window.scrollToCalls).toHaveLength(0);
});

test('abort clears pending state and permits a later navigation', () => {
  const { controller, loader, main, message, timer } = createHarness();
  const first = new AbortController();
  const second = new AbortController();

  controller.beforePreparation(first.signal);
  timer.advanceTo(REVEAL_DELAY_MS);
  first.abort();

  expect(visibleAttribute(loader)).toBe('false');
  expect(message.textContent).toBe('');
  expect(main.hasAttribute('aria-busy')).toBe(false);
  expect(timer.pending.size).toBe(0);

  controller.beforePreparation(second.signal);
  timer.advanceBy(REVEAL_DELAY_MS);

  expect(visibleAttribute(loader)).toBe('true');
  expect(message.textContent).toBe('Loading requested page');
  expect(main.getAttribute('aria-busy')).toBe('true');
});

test('a repeated preparation cancels the prior timer and abort', () => {
  const { controller, loader, main, message, timer } = createHarness();
  const first = new AbortController();
  const second = new AbortController();

  controller.beforePreparation(first.signal);
  const [firstTimerId] = timer.pending.keys();
  controller.beforePreparation(second.signal);
  const [secondTimerId] = timer.pending.keys();
  first.abort();
  /* The prior reveal callback is already detached from `pending`; running it by
   * id proves the signal-identity guard makes it inert rather than merely
   * unreachable. */
  timer.run(firstTimerId);

  expect(firstTimerId).not.toBe(secondTimerId);
  expect(visibleAttribute(loader)).toBe('false');
  expect(message.textContent).toBe('');
  expect(main.hasAttribute('aria-busy')).toBe(false);
  expect(timer.pending.has(firstTimerId)).toBe(false);
  expect(timer.pending.size).toBe(2);

  timer.run(secondTimerId);
  expect(visibleAttribute(loader)).toBe('true');
  expect(main.getAttribute('aria-busy')).toBe('true');
});

test('focuses only after a prepared navigation reaches page load', () => {
  const { controller, main, window } = createHarness();
  const signal = new AbortController();

  controller.pageLoad();
  expect(main.focusCalls).toEqual([]);

  controller.beforePreparation(signal.signal);
  controller.pageLoad();

  expect(main.focusCalls).toEqual([{ preventScroll: true }]);
  expect(window.scrollToCalls).toEqual([]);
});

test('page load marks the incoming main busy before it clears the prior state', () => {
  const { controller, main } = createHarness();
  const signal = new AbortController();
  const seen = [];
  const originalSet = main.setAttribute.bind(main);
  const originalRemove = main.removeAttribute.bind(main);
  main.setAttribute = (name, value) => {
    seen.push(`set:${name}`);
    originalSet(name, value);
  };
  main.removeAttribute = (name) => {
    seen.push(`remove:${name}`);
    originalRemove(name);
  };

  controller.beforePreparation(signal.signal);
  seen.length = 0;
  controller.pageLoad();

  /*
   * The INCOMING `main` is marked before `cancel()` runs, so a screen reader
   * still holding the outgoing document is told the swap is in flight rather
   * than being told a node is ready before it exists. The trailing removals are
   * `busy.clear()` sweeping the outgoing mark and the settled state.
   */
  expect(seen[0]).toBe('set:aria-busy');
  expect(seen.at(-1)).toBe('remove:aria-busy');
  expect(seen.filter((entry) => entry === 'set:aria-busy')).toHaveLength(1);
  expect(main.hasAttribute('aria-busy')).toBe(false);
});

test('an unprepared page load marks and immediately settles the incoming main', () => {
  const { controller, main } = createHarness();
  const seen = [];
  const originalSet = main.setAttribute.bind(main);
  const originalRemove = main.removeAttribute.bind(main);
  main.setAttribute = (name, value) => {
    seen.push(`set:${name}`);
    originalSet(name, value);
  };
  main.removeAttribute = (name) => {
    seen.push(`remove:${name}`);
    originalRemove(name);
  };

  controller.pageLoad();

  /* The hard first load has no outgoing document, but the mark is still
   * applied and settled so the resting state is identical on every path. */
  expect(seen[0]).toBe('set:aria-busy');
  expect(seen.filter((entry) => entry === 'set:aria-busy')).toHaveLength(1);
  expect(seen.at(-1)).toBe('remove:aria-busy');
  expect(main.hasAttribute('aria-busy')).toBe(false);
  expect(main.focusCalls).toEqual([]);
});

test('cleans up a replaced main and focuses it on page load', () => {
  const { controller, document, main } = createHarness();
  const signal = new AbortController();
  const replacement = new FakeElement();

  controller.beforePreparation(signal.signal);
  document.main = replacement;
  controller.pageLoad();

  expect(main.hasAttribute('aria-busy')).toBe(false);
  expect(replacement.hasAttribute('aria-busy')).toBe(false);
  expect(replacement.focusCalls).toEqual([{ preventScroll: true }]);
});

test('reuses a replacement loader and updates its live message', () => {
  const { controller, document, loader, message, timer } = createHarness();
  const signal = new AbortController();
  const replacement = new FakeElement({ 'data-visible': 'false' });
  replacement.message = new FakeElement();

  controller.beforePreparation(signal.signal);
  document.loader = replacement;
  timer.advanceTo(REVEAL_DELAY_MS);

  expect(visibleAttribute(loader)).toBe('false');
  expect(visibleAttribute(replacement)).toBe('true');
  expect(replacement.message.textContent).toBe('Loading requested page');
  expect(message.textContent).toBe('');

  controller.pageLoad();
  expect(visibleAttribute(replacement)).toBe('false');
  expect(replacement.message.textContent).toBe('');
});

test('ignores an already-aborted preparation', () => {
  const { controller, main, timer } = createHarness();
  const signal = new AbortController();
  signal.abort();

  controller.beforePreparation(signal.signal);

  expect(timer.pending.size).toBe(0);
  expect(main.hasAttribute('aria-busy')).toBe(false);
});

test('initial page load never focuses or scrolls', () => {
  const { controller, loader, main, message, window } = createHarness();
  main.setAttribute('aria-busy', 'true');
  loader.attributes.set('data-visible', 'true');
  message.textContent = 'Loading requested page';

  controller.pageLoad();

  expect(visibleAttribute(loader)).toBe('false');
  expect(message.textContent).toBe('');
  expect(main.hasAttribute('aria-busy')).toBe(false);
  expect(main.focusCalls).toHaveLength(0);
  expect(window.scrollToCalls).toHaveLength(0);
});

test('cancel is idempotent and clears all pending navigation state', () => {
  const { controller, loader, main, message, timer } = createHarness();
  const signal = createTrackedSignal();

  controller.beforePreparation(signal);
  timer.advanceTo(REVEAL_DELAY_MS);
  expect(signal.listenerCount).toBe(1);
  expect(visibleAttribute(loader)).toBe('true');
  expect(main.getAttribute('aria-busy')).toBe('true');

  controller.cancel();
  controller.cancel();

  expect(signal.listenerCount).toBe(0);
  expect(timer.pending.size).toBe(0);
  expect(visibleAttribute(loader)).toBe('false');
  expect(message.textContent).toBe('');
  expect(main.hasAttribute('aria-busy')).toBe(false);

  controller.pageLoad();
  expect(main.focusCalls).toHaveLength(0);
});
