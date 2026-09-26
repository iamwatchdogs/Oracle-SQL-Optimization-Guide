import { expect, test } from '@playwright/test';
import { navigateTo } from './support/navigation.mjs';

/*
 * Astro's route announcer, and the shell's cleanup of it.
 *
 * Split out of `route-loader.spec.mjs` because the loader's own behaviour is
 * asserted against a held response and a real swap, while this is three
 * sequential navigations with a DOM count between them. They share the
 * `navigateTo` helper and nothing else.
 */

/*
 * Astro appends an `aria-live="assertive"` announcer to <body> on every completed
 * navigation and never removes it. The loader already moves focus to `main`, so
 * the announcer is a duplicate announcement and an unbounded DOM leak across a
 * 37-page linear read.
 *
 * The invariant under test is "does not accumulate", so what is asserted is that
 * no navigation ever leaves a SECOND announcer behind — not that the count is
 * exactly zero at one sampled instant.
 *
 * The previous version polled to zero with a 5s budget. On a loaded machine the
 * 150ms cleanup defer plus a slow `page-load` could exceed that, and the failure
 * read as an unbounded leak when nothing had leaked. Sampling the peak across the
 * navigations, then confirming it drains, tests the claim directly and does not
 * depend on how quickly the machine gets there.
 */
test.describe('route announcer', () => {
  /*
   * Desktop viewport, deliberately.
   *
   * The invariant is about how many live regions accumulate in the DOM, which has
   * nothing to do with layout. But the navigation is driven by clicking in-article
   * links, and at 412px those sit under a sticky header and a collapsed mobile
   * TOC: the click could be intercepted and the `waitForFunction` for the new
   * pathname would time out — which is what happened on the `mobile-chromium`
   * project. Running this at a width where the click is unambiguous tests the
   * thing it is actually about. Viewport coverage lives in the layout and
   * route-loader specs.
   */
  test.use({ viewport: { width: 1280, height: 900 } });

  test('does not leave a live region accumulating across navigations', async ({ page }) => {
    await page.goto('/');

    // Written out rather than looped: the navigations must not overlap, so the
    // sequence is the point, and a loop would need an await-per-iteration
    // suppression to say so.
    await navigateTo(page, '/00-preface/');
    const first = await page.locator('.astro-route-announcer').count();
    await navigateTo(page, '/00-preface/01-why-evidence-grades/');
    const second = await page.locator('.astro-route-announcer').count();
    await navigateTo(page, '/00-preface/02-how-to-prove-a-win/');
    const third = await page.locator('.astro-route-announcer').count();

    // Never more than the one Astro is entitled to mid-navigation.
    expect(Math.max(first, second, third)).toBeLessThanOrEqual(1);
    await expect
      .poll(() => page.locator('.astro-route-announcer').count(), { timeout: 15_000 })
      .toBe(0);
  });
});
