import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import {
  FakeElement,
  createHarness,
  createTrackedSignal,
} from '../fixtures/route-loader.fixtures.mjs';

test('exposes the native hooks and cancel', () => {
  const { controller } = createHarness();

  expect(Object.keys(controller).toSorted()).toEqual(['beforePreparation', 'cancel', 'pageLoad']);
});

test('before preparation delays the loader and publishes a fresh message', () => {
  const { controller, loader, main, message, timer } = createHarness();
  const signal = new AbortController();

  controller.beforePreparation(signal.signal);

  expect(main.getAttribute('aria-busy')).toBe('true');
  expect(loader.dataset.visible).toBe('false');
  expect(message.textContent).toBe('');
  expect(timer.pending.size).toBe(1);
  expect([...timer.pending.values()][0].delay).toBe(180);

  timer.runBefore(180);
  expect(loader.dataset.visible).toBe('false');

  timer.runAt(180);
  expect(loader.dataset.visible).toBe('true');
  expect(message.textContent).toBe('Loading requested page');
});

test('a fast page load clears state without showing the loader', () => {
  const { controller, loader, main, message, timer, window } = createHarness();
  const signal = new AbortController();

  controller.beforePreparation(signal.signal);
  const [timerId] = timer.pending.keys();
  controller.pageLoad();
  timer.run(timerId);

  expect(loader.dataset.visible).toBe('false');
  expect(message.textContent).toBe('');
  expect(main.hasAttribute('aria-busy')).toBe(false);
  expect(timer.pending.size).toBe(0);
  expect(window.scrollToCalls).toHaveLength(0);
});

test('abort clears pending state and permits a later navigation', () => {
  const { controller, loader, main, message, timer } = createHarness();
  const first = new AbortController();
  const second = new AbortController();

  controller.beforePreparation(first.signal);
  timer.runAt(180);
  first.abort();

  expect(loader.dataset.visible).toBe('false');
  expect(message.textContent).toBe('');
  expect(main.hasAttribute('aria-busy')).toBe(false);
  expect(timer.pending.size).toBe(0);

  controller.beforePreparation(second.signal);
  timer.runAt(180);

  expect(loader.dataset.visible).toBe('true');
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
  timer.run(firstTimerId);

  expect(firstTimerId).not.toBe(secondTimerId);
  expect(loader.dataset.visible).toBe('false');
  expect(message.textContent).toBe('');
  expect(main.getAttribute('aria-busy')).toBe('true');
  expect(timer.pending.has(firstTimerId)).toBe(false);
  expect(timer.pending.size).toBe(1);

  timer.run(secondTimerId);
  expect(loader.dataset.visible).toBe('true');
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
  timer.runAt(180);

  expect(loader.dataset.visible).toBe('false');
  expect(replacement.dataset.visible).toBe('true');
  expect(replacement.message.textContent).toBe('Loading requested page');
  expect(message.textContent).toBe('');

  controller.pageLoad();
  expect(replacement.dataset.visible).toBe('false');
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
  loader.dataset.visible = 'true';
  message.textContent = 'Loading requested page';

  controller.pageLoad();

  expect(loader.dataset.visible).toBe('false');
  expect(message.textContent).toBe('');
  expect(main.hasAttribute('aria-busy')).toBe(false);
  expect(main.focusCalls).toHaveLength(0);
  expect(window.scrollToCalls).toHaveLength(0);
});

test('cancel is idempotent and clears all pending navigation state', () => {
  const { controller, loader, main, message, timer } = createHarness();
  const signal = createTrackedSignal();

  controller.beforePreparation(signal);
  timer.runAt(180);
  expect(signal.listenerCount).toBe(1);
  expect(loader.dataset.visible).toBe('true');
  expect(main.getAttribute('aria-busy')).toBe('true');

  controller.cancel();
  controller.cancel();

  expect(signal.listenerCount).toBe(0);
  expect(timer.pending.size).toBe(0);
  expect(loader.dataset.visible).toBe('false');
  expect(message.textContent).toBe('');
  expect(main.hasAttribute('aria-busy')).toBe(false);

  controller.pageLoad();
  expect(main.focusCalls).toHaveLength(0);
});

test('BaseLayout wraps the loader only after setting pending state', () => {
  const source = readFileSync(
    new URL('../../src/layouts/BaseLayout.astro', import.meta.url),
    'utf8',
  );
  const preparation = 'controller.beforePreparation(event.signal);';
  const wrapping = 'event.loader = wrapRouteLoader(';
  const prevented = '() => event.defaultPrevented';

  expect(source).toContain(
    "import { createRouteLoaderController, wrapRouteLoader } from '../lib/route-loader.mjs';",
  );
  expect(source).toContain(preparation);
  expect(source).toContain(wrapping);
  expect(source).toContain(prevented);
  expect(source.indexOf(preparation)).toBeLessThan(source.indexOf(wrapping));
  expect(source.indexOf(wrapping)).toBeLessThan(source.indexOf(prevented));
  expect(source).not.toContain('astro:before-swap');
  expect(source).not.toContain('astro:after-swap');
});
