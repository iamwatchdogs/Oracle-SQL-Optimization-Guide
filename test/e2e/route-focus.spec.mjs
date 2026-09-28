import { expect, test } from '@playwright/test';
import { navigateTo } from './support/navigation.mjs';

/*
 * The focus handoff, end to end.
 *
 * This is the whole of what survived the route loader's removal, so it needs a real
 * browser guard rather than only a unit one: the unit spec proves the controller
 * calls `focus()` on the element its fake document hands back, and cannot prove
 * that a client-side navigation in a real Astro router produces a `<main id="main">`
 * at the moment `astro:page-load` fires, or that the handoff lands after the router
 * has finished restoring scroll.
 */
const activeId = (page) => page.evaluate(() => document.activeElement?.id);

const focusTarget = (page) =>
  page.evaluate(() => {
    const main = document.querySelector('#main');
    return {
      tag: main?.tagName,
      tabIndex: main?.getAttribute('tabindex'),
      outlineStyle: main ? getComputedStyle(main).outlineStyle : null,
    };
  });

/** Half the document's own height, settled, so the offset is not a magic number. */
const parkTheScroll = (page) =>
  page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, Math.round(document.documentElement.scrollHeight / 2));
    await new Promise((resolve) => {
      requestAnimationFrame(() => resolve());
    });
    return window.scrollY;
  });

async function landsOnMainAfterANavigationAndNotOnTheFirstPaint({ page }) {
  await page.goto('/');
  /* `astro:page-load` fires on the first paint too, and must do nothing there: a
     reader who has tabbed into the page and then reloads should stay put. */
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('BODY');

  await navigateTo(page, '/00-preface/');

  await expect.poll(() => activeId(page)).toBe('main');
}

async function doesNotScrollThePageAsPartOfTheHandoff({ page }) {
  await page.goto('/00-preface/');
  await page.waitForTimeout(400);

  /* Parked mid-document so a handoff that forgot `preventScroll` would restore the
     OLD offset instead of the top of the new page — a more visible failure than
     losing focus entirely. The first version scrolled to a hardcoded 2400px, which
     is a silent no-op on any page shorter than that. */
  expect(await parkTheScroll(page), 'the page was too short to scroll').toBeGreaterThan(0);

  await navigateTo(page, '/00-preface/02-how-to-prove-a-win/');

  await expect.poll(() => activeId(page)).toBe('main');
  /* The router scrolls to the top on a push navigation. The handoff must not undo
     that, and must not be the thing that restored the old offset either. */
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
}

async function targetsAProgrammaticallyFocusableMainLandmark({ page }) {
  await page.goto('/00-preface/');
  await navigateTo(page, '/00-preface/02-how-to-prove-a-win/');

  await expect.poll(() => activeId(page)).toBe('main');

  /*
   * What the handoff needs from its target: a `<main>` that is reachable by script
   * but not in the tab sequence — `tabindex="-1"` — so the router can move focus
   * without adding a stop to every reader's tab run.
   *
   * Note what this does NOT assert: a visible ring. `<main>` ships
   * `focus:outline-none`, so the handoff is invisible on screen and only screen
   * readers get the signal. That is a pre-existing decision in the catch-all
   * template, not something the handoff controls, and it is pinned here because
   * DESIGN.md claimed a 2px ring on this target and no ring is rendered.
   */
  const target = await focusTarget(page);

  expect(target.tag).toBe('MAIN');
  expect(target.tabIndex).toBe('-1');
  expect(target.outlineStyle).toBe('none');
}

test.describe('focus handoff', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test(
    'lands on main after a client navigation, not on the first paint',
    landsOnMainAfterANavigationAndNotOnTheFirstPaint,
  );
  test('does not scroll the page as part of the handoff', doesNotScrollThePageAsPartOfTheHandoff);
  test(
    'targets a programmatically focusable main landmark',
    targetsAProgrammaticallyFocusableMainLandmark,
  );
});
