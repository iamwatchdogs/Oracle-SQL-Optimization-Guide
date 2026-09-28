import { expect, test } from '@playwright/test';
import { ms } from './support/disclosure.mjs';
import { LOADER } from './support/route-loader.mjs';

/*
 * The loader's presentation contract, split out of `route-loader.spec.mjs`.
 *
 * The navigation-behaviour specs there are long and each drives a held response
 * and a full swap; these two are static assertions about the rendered element
 * and have no setup in common with them.
 */
test.describe('route loader — presentation', () => {
  test('fades in over the 180ms the design system specifies', async ({ page }) => {
    await page.goto('/');
    const duration = await page
      .locator(LOADER)
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    // Reported in seconds (`"0.18s"`); `ms()` normalises it to milliseconds.
    expect(ms(duration)).toBe(180);
  });
});

/*
 * The loader must be QUIESCENT while it is hidden.
 *
 * The loader is `transition:persist`, so it is in the DOM from the first paint and
 * survives every client navigation. Its three bars carry `animate-pulse`,
 * whose iteration count is `Infinity` — so before this was fixed, three infinite
 * 2s animations composited on every page forever, animating a loader that was
 * `opacity: 0` and would not be shown again. Measured on the built site before the
 * fix: `["pulse","pulse","pulse"]` still running 6s after load.
 *
 * The second cost is this test suite's own: a page that never stops animating can
 * never satisfy a "wait for the target to stop moving" check, which is how the
 * perpetual animation was found in the first place — a Playwright actionability
 * check timing out on an element that had not moved in six seconds.
 */
test.describe('route loader — rest', () => {
  test('runs no animations at rest, and resumes them when revealed', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(
      () => !document.querySelector('[data-route-loader]') || document.readyState === 'complete',
      undefined,
      { timeout: 15_000 },
    );
    // Let the page finish settling so this measures the REST state, not the
    // entrance animation.
    await page.waitForTimeout(1200);

    const atRest = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((a) => a.playState === 'running')
        .map((a) => a.animationName),
    );
    expect(atRest, 'the hidden loader is still animating').toEqual([]);

    // And the pause must not be permanent: revealing it has to bring the
    // loader back, or a slow navigation would show a frozen placeholder.
    await page.evaluate(() => {
      document.querySelector('[data-route-loader]').dataset.visible = 'true';
    });
    await expect
      .poll(
        () =>
          page.evaluate(
            () => document.getAnimations().filter((a) => a.playState === 'running').length,
          ),
        { timeout: 5000 },
      )
      .toBeGreaterThan(0);
  });
});
