import { expect, test } from 'vitest';
import {
  bindDisclosureController,
  CLOSE_FALLBACK_MS,
  CLOSING_ATTRIBUTE,
} from '../../src/lib/disclosure-controller.mjs';
import {
  createClick,
  createHarness,
  createNestedTree,
  createTree,
  nestDisclosures,
  transitionEnd,
} from '../fixtures/disclosure-controller.fixtures.mjs';

test('binds one delegated listener set per document', () => {
  const { document, dependencies, controller } = createHarness();

  const again = bindDisclosureController(dependencies);

  expect(again).toBe(controller);
  expect(document.listenerCount('click')).toBe(1);
  expect(document.listenerCount('transitionend')).toBe(1);
  expect(document.listenerCount('astro:before-swap')).toBe(1);
});

test('marks the disclosure closing, keeps it open, and arms the fallback', () => {
  const { document, clock } = createHarness();
  const { details, summary, flow } = createTree();

  const click = createClick(summary);
  document.dispatch('click', click.event);

  expect(click.state.prevented).toBe(1);
  expect(details.hasAttribute(CLOSING_ATTRIBUTE)).toBe(true);
  expect(details.open).toBe(true);
  expect(clock.delays()).toEqual([CLOSE_FALLBACK_MS]);
  expect(flow).not.toBeNull();
});

test('finalizes the close on the flow grid-template-rows transitionend', () => {
  const { document, clock } = createHarness();
  const { details, summary, flow } = createTree();

  document.dispatch('click', createClick(summary).event);
  document.dispatch('transitionend', transitionEnd(flow));

  expect(details.hasAttribute(CLOSING_ATTRIBUTE)).toBe(false);
  expect(details.open).toBe(false);
  expect(clock.delays()).toEqual([]);
});

test('ignores child transitionend events and other properties', () => {
  const { document, clock } = createHarness();
  const { details, summary, flow, inner, body } = createTree();

  document.dispatch('click', createClick(summary).event);
  document.dispatch('transitionend', transitionEnd(inner));
  document.dispatch('transitionend', transitionEnd(body));
  document.dispatch('transitionend', transitionEnd(flow, 'opacity'));

  expect(details.hasAttribute(CLOSING_ATTRIBUTE)).toBe(true);
  expect(details.open).toBe(true);
  expect(clock.delays()).toEqual([CLOSE_FALLBACK_MS]);
});

test('finalizes the close on the bounded fallback', () => {
  const { document, clock } = createHarness();
  const { details, summary } = createTree();

  document.dispatch('click', createClick(summary).event);
  clock.flush();

  expect(details.hasAttribute(CLOSING_ATTRIBUTE)).toBe(false);
  expect(details.open).toBe(false);
  expect(clock.delays()).toEqual([]);
});

test('a second click while closing cancels the close and leaves it open', () => {
  const { document, clock } = createHarness();
  const { details, summary, flow } = createTree();

  document.dispatch('click', createClick(summary).event);
  const second = createClick(summary);
  document.dispatch('click', second.event);

  expect(second.state.prevented).toBe(1);
  expect(details.hasAttribute(CLOSING_ATTRIBUTE)).toBe(false);
  expect(details.open).toBe(true);
  expect(clock.delays()).toEqual([]);

  document.dispatch('transitionend', transitionEnd(flow));
  expect(details.open).toBe(true);
});

test('reduced motion keeps native close behavior', () => {
  const { document, clock } = createHarness({ reducedMotion: true });
  const { details, summary } = createTree();

  const click = createClick(summary);
  document.dispatch('click', click.event);

  expect(click.state.prevented).toBe(0);
  expect(details.hasAttribute(CLOSING_ATTRIBUTE)).toBe(false);
  expect(details.open).toBe(true);
  expect(clock.delays()).toEqual([]);
});

test('leaves closed, flowless, and non-summary clicks to the browser', () => {
  const { document, clock } = createHarness();
  const closed = createTree({ open: false });
  const flowless = createTree({ withFlow: false });
  const open = createTree();

  const closedClick = createClick(closed.summary);
  const flowlessClick = createClick(flowless.summary);
  const bodyClick = createClick(open.body);

  document.dispatch('click', closedClick.event);
  document.dispatch('click', flowlessClick.event);
  document.dispatch('click', bodyClick.event);

  expect(closedClick.state.prevented).toBe(0);
  expect(flowlessClick.state.prevented).toBe(0);
  expect(bodyClick.state.prevented).toBe(0);
  expect(closed.details.hasAttribute(CLOSING_ATTRIBUTE)).toBe(false);
  expect(flowless.details.hasAttribute(CLOSING_ATTRIBUTE)).toBe(false);
  expect(open.details.hasAttribute(CLOSING_ATTRIBUTE)).toBe(false);
  expect(clock.delays()).toEqual([]);
});

test('an opening click is never intercepted', () => {
  const { document, clock } = createHarness();
  const { details, summary } = createTree({ open: false });

  const click = createClick(summary);
  document.dispatch('click', click.event);
  details.open = true;

  expect(click.state.prevented).toBe(0);
  expect(clock.delays()).toEqual([]);
});

test('clears pending close work before a page swap', () => {
  const { document, clock } = createHarness();
  const { details, summary } = createTree();

  document.dispatch('click', createClick(summary).event);
  document.dispatch('astro:before-swap');

  expect(details.hasAttribute(CLOSING_ATTRIBUTE)).toBe(false);
  expect(details.open).toBe(false);
  expect(clock.delays()).toEqual([]);
});
test('a nested summary closes the inner details, not its outer parent', () => {
  const { document, clock } = createHarness();
  const { details, nested } = createNestedTree();

  const click = createClick(nested.summary);
  document.dispatch('click', click.event);

  expect(click.state.prevented).toBe(1);
  expect(nested.details.hasAttribute(CLOSING_ATTRIBUTE)).toBe(true);
  expect(nested.details.open).toBe(true);
  expect(details.hasAttribute(CLOSING_ATTRIBUTE)).toBe(false);
  expect(details.open).toBe(true);
  expect(clock.delays()).toEqual([CLOSE_FALLBACK_MS]);

  document.dispatch('transitionend', transitionEnd(nested.flow));

  expect(nested.details.open).toBe(false);
  expect(details.open).toBe(true);
});

test('a three-deep summary chain closes only the innermost details', () => {
  const { document, clock } = createHarness();
  const { outer, innermost } = nestDisclosures(createTree(), createTree(), createTree());

  const click = createClick(innermost.summary);
  document.dispatch('click', click.event);

  expect(click.state.prevented).toBe(1);
  expect(innermost.details.hasAttribute(CLOSING_ATTRIBUTE)).toBe(true);
  expect(outer.details.hasAttribute(CLOSING_ATTRIBUTE)).toBe(false);
  expect(outer.details.open).toBe(true);
  expect(clock.delays()).toEqual([CLOSE_FALLBACK_MS]);

  document.dispatch('transitionend', transitionEnd(outer.flow));

  expect(innermost.details.open).toBe(true);

  document.dispatch('transitionend', transitionEnd(innermost.flow));

  expect(innermost.details.hasAttribute(CLOSING_ATTRIBUTE)).toBe(false);
  expect(innermost.details.open).toBe(false);
  expect(outer.details.open).toBe(true);
  expect(clock.delays()).toEqual([]);
});
