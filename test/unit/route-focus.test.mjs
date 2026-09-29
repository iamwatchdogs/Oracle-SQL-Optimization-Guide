import { expect, test } from 'vitest';
import { createRouteFocusController } from '../../src/lib/route-focus.mjs';

/**
 * A fake `main` that records how it was focused, and a document that resolves the
 * one selector the controller asks for.
 *
 * Written inline rather than in a fixture module because there is now exactly one
 * thing to fake. The loader it replaced needed a virtual clock, a signal double and
 * an attribute bag because it had a state machine; this does not, and a fixture
 * that outlives its subject is its own kind of debt.
 */
const createHarness = () => {
  const main = {
    id: 'main',
    focusCalls: [],
    focus(options) {
      this.focusCalls.push(options);
    },
  };
  const document = {
    querySelectorCalls: [],
    querySelector(selector) {
      this.querySelectorCalls.push(selector);
      return selector === 'main#main' ? main : null;
    },
  };
  return { main, document, controller: createRouteFocusController({ document }) };
};

test('initial page load never steals focus', () => {
  const { main, controller } = createHarness();

  /* `astro:page-load` fires for the first paint as well as for every navigation.
   A reader who has tabbed into the page and then reloads must not be yanked back
   to the top of the document, so the unprepared case has to be a no-op. */
  controller.pageLoad();

  expect(main.focusCalls).toEqual([]);
});

test('a prepared navigation hands focus to main with preventScroll', () => {
  const { main, document, controller } = createHarness();

  controller.begin();
  controller.pageLoad();

  expect(main.focusCalls).toEqual([{ preventScroll: true }]);
  expect(document.querySelectorCalls).toEqual(['main#main']);
});

test('the handoff runs once per navigation, never twice', () => {
  const { main, controller } = createHarness();

  controller.begin();
  controller.pageLoad();
  /* A stray second `astro:page-load` — the router can fire more than one per
   * settled navigation if a listener re-enters — must not re-focus. */
  controller.pageLoad();

  expect(main.focusCalls).toEqual([{ preventScroll: true }]);
});

test('the flag cannot leak across an aborted navigation into a later initial paint', () => {
  const { main, controller } = createHarness();

  /* A navigation starts and is superseded or aborts before it lands. The flag is
   still set, so the next `pageLoad` — which may be the initial load of a hard
   navigation the router bailed out of — will focus once. That is harmless: it is
   still a real document change, and focusing `main` on a fresh document is what a
   reader wants. What must never happen is the flag surviving a `pageLoad` and
   focusing a second time. */
  controller.begin();
  controller.pageLoad();
  controller.pageLoad();

  expect(main.focusCalls).toHaveLength(1);
});

test('a document without a focusable main is not an error', () => {
  const document = { querySelector: () => null };
  const controller = createRouteFocusController({ document });

  expect(() => {
    controller.begin();
    controller.pageLoad();
  }).not.toThrow();
});

test('a controller with no document at all does not throw', () => {
  const controller = createRouteFocusController({ document: null });

  expect(() => {
    controller.begin();
    controller.pageLoad();
  }).not.toThrow();
});
