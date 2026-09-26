import { expect, test } from 'vitest';
import * as routeLoaderModule from '../../src/lib/route-loader.mjs';
import { createHarness } from '../fixtures/route-loader.fixtures.mjs';

test('defaultPrevented defaults false and composed pageLoad focuses once', async () => {
  const wrap = routeLoaderModule.wrapRouteLoader;
  expect(typeof wrap).toBe('function');
  if (typeof wrap !== 'function') {
    return;
  }

  const { controller, loader, main, message } = createHarness();
  controller.beforePreparation(new AbortController().signal);
  const context = { prefix: 'ok' };
  let calls = 0;
  let cancelCalls = 0;
  let received;
  const original = function (...args) {
    calls += 1;
    received = { args, thisValue: this };
    return Promise.resolve(null);
  };
  const wrapped = wrap(original, () => {
    cancelCalls += 1;
    controller.cancel();
  });

  const result = await wrapped.call(context, 'value', 7);
  controller.pageLoad();

  expect(result).toBeNull();
  expect(calls).toBe(1);
  expect(cancelCalls).toBe(0);
  expect(received.args).toEqual(['value', 7]);
  expect(received.thisValue).toBe(context);
  expect(main.focusCalls).toEqual([{ preventScroll: true }]);
  expect(loader.dataset.visible).toBe('false');
  expect(main.hasAttribute('aria-busy')).toBe(false);
  expect(message.textContent).toBe('');
});

test('defaultPrevented cancels and prevents composed pageLoad focus', async () => {
  const wrap = routeLoaderModule.wrapRouteLoader;
  expect(typeof wrap).toBe('function');
  if (typeof wrap !== 'function') {
    return;
  }

  const { controller, loader, main, message } = createHarness();
  controller.beforePreparation(new AbortController().signal);
  let calls = 0;
  let cancelCalls = 0;
  let defaultPrevented = false;
  const wrapped = wrap(
    () => {
      calls += 1;
      defaultPrevented = true;
      return null;
    },
    () => {
      cancelCalls += 1;
      controller.cancel();
    },
    () => defaultPrevented,
  );

  const result = await wrapped();
  controller.pageLoad();

  expect(result).toBeNull();
  expect(calls).toBe(1);
  expect(cancelCalls).toBe(1);
  expect(main.focusCalls).toHaveLength(0);
  expect(loader.dataset.visible).toBe('false');
  expect(main.hasAttribute('aria-busy')).toBe(false);
  expect(message.textContent).toBe('');
});

test('wrapRouteLoader cancels and rethrows a loader error', async () => {
  const wrap = routeLoaderModule.wrapRouteLoader;
  expect(typeof wrap).toBe('function');
  if (typeof wrap !== 'function') {
    return;
  }

  const error = new Error('loader failed');
  let calls = 0;
  let cancelCalls = 0;
  let preventedChecks = 0;
  const wrapped = wrap(
    () => {
      calls += 1;
      throw error;
    },
    () => {
      cancelCalls += 1;
    },
    () => {
      preventedChecks += 1;
      return false;
    },
  );

  let caught;
  try {
    await wrapped();
  } catch (value) {
    caught = value;
  }

  expect(caught).toBe(error);
  expect(calls).toBe(1);
  expect(cancelCalls).toBe(1);
  expect(preventedChecks).toBe(0);
});
