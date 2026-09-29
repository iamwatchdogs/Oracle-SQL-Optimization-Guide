import { expect, test } from 'vitest';
import { CLOSE_FALLBACK_MS, CLOSING_ATTRIBUTE } from '../../src/lib/disclosure-controller.mjs';
import {
  createClick,
  createHarness,
  createTree,
  transitionEnd,
} from '../fixtures/disclosure-controller.fixtures.mjs';

test('starting a second close force-finishes the first mid-close disclosure', () => {
  const { document, clock } = createHarness();
  const first = createTree();
  const second = createTree();

  document.dispatch('click', createClick(first.summary).event);
  expect(first.details.hasAttribute(CLOSING_ATTRIBUTE)).toBe(true);

  document.dispatch('click', createClick(second.summary).event);

  expect(first.details.hasAttribute(CLOSING_ATTRIBUTE)).toBe(false);
  expect(first.details.open).toBe(false);
  expect(clock.delays()).toEqual([CLOSE_FALLBACK_MS]);
  expect(second.details.hasAttribute(CLOSING_ATTRIBUTE)).toBe(true);
  expect(second.details.open).toBe(true);

  document.dispatch('transitionend', transitionEnd(first.flow));

  expect(second.details.hasAttribute(CLOSING_ATTRIBUTE)).toBe(true);
  expect(second.details.open).toBe(true);

  document.dispatch('transitionend', transitionEnd(second.flow));

  expect(second.details.hasAttribute(CLOSING_ATTRIBUTE)).toBe(false);
  expect(second.details.open).toBe(false);
});

test('a late transitionend from a force-finished flow cannot reopen it', () => {
  const { document, clock } = createHarness();
  const first = createTree();
  const second = createTree();

  document.dispatch('click', createClick(first.summary).event);
  document.dispatch('click', createClick(second.summary).event);
  document.dispatch('transitionend', transitionEnd(second.flow));
  document.dispatch('transitionend', transitionEnd(first.flow));

  expect(first.details.hasAttribute(CLOSING_ATTRIBUTE)).toBe(false);
  expect(first.details.open).toBe(false);
  expect(second.details.hasAttribute(CLOSING_ATTRIBUTE)).toBe(false);
  expect(second.details.open).toBe(false);
  expect(clock.delays()).toEqual([]);
});

test('a finalize clears the fallback through whichever source provides clearTimeout', () => {
  const { document, clock, cleared } = createHarness({
    provideClearTimeout: false,
    provideWindowClearTimeout: true,
  });
  const { details, summary, flow } = createTree();

  document.dispatch('click', createClick(summary).event);
  const [fallbackId] = clock.ids();
  document.dispatch('transitionend', transitionEnd(flow));

  expect(fallbackId).toBeDefined();
  expect(cleared).toEqual([fallbackId]);
  expect(details.hasAttribute(CLOSING_ATTRIBUTE)).toBe(false);
  expect(details.open).toBe(false);
});

test('a stale fallback timer cannot finalize a later disclosure', () => {
  const { document, clock } = createHarness({ provideClearTimeout: false });
  const first = createTree();
  const second = createTree();

  document.dispatch('click', createClick(first.summary).event);
  const [staleId] = clock.ids();

  document.dispatch('click', createClick(second.summary).event);

  expect(first.details.open).toBe(false);
  expect(first.details.hasAttribute(CLOSING_ATTRIBUTE)).toBe(false);

  expect(clock.run(staleId)).toBe(true);

  expect(second.details.hasAttribute(CLOSING_ATTRIBUTE)).toBe(true);
  expect(second.details.open).toBe(true);

  clock.flush();

  expect(second.details.hasAttribute(CLOSING_ATTRIBUTE)).toBe(false);
  expect(second.details.open).toBe(false);
});
