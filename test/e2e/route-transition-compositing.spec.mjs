/*
 * Compositing rules for the route swap.
 *
 * Split from `route-transition.spec.mjs`, which is about choreography — which zone
 * goes when, and in which direction. These are the two properties that decide
 * whether a staggered swap is legible at all, and both were shipped broken once.
 *
 * Every zone's arriving half carries an opacity animation, so it is an opaque, filled
 * snapshot from frame one and the departing piece is UNCOVERED rather than faded
 * toward nothing. Without it the dead beat reads as a hole in the page.
 *
 * Nothing composites additively. Astro's `astroFadeIn` and `astroFadeOut` bake
 * `mix-blend-mode: plus-lighter` into their keyframes, and addition is only correct
 * while the two opacities sum to 1 — which a stagger never holds. The under-exposed
 * frames showed the paper through, and this paper is `#0c0c0e`, so the middle of
 * every chapter change dimmed the page and brought it back.
 */
import { expect, test } from '@playwright/test';
import { DESKTOP_VIEWPORT } from './support/toc.mjs';
import { navigateTo } from './support/navigation.mjs';
import { EXIT_ORDER, PROOF, half, recordSwap } from './support/zone-swap.mjs';

test.describe('the route swap, composited', () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test('every zone is opaque underneath and clears on the way out', async ({ page }) => {
    const entries = await recordSwap(page, () => navigateTo(page, PROOF));
    /* `meta` is home-only, so it is present in the trace on some navigations and
       absent on others; the zones below it are not. */
    const zones = [...EXIT_ORDER, 'meta'].filter((zone) => half(entries, 'new', zone).length > 0);

    for (const zone of zones) {
      for (const entry of half(entries, 'new', zone)) {
        expect(entry.opacity.at(0), `${zone} arrives already painted`).toBe('0');
        expect(entry.opacity.at(-1), `${zone} does not arrive opaque`).toBe('1');
      }
    }
    for (const zone of EXIT_ORDER) {
      for (const entry of half(entries, 'old', zone)) {
        expect(entry.opacity.at(0), `${zone} does not start opaque`).toBe('1');
        expect(entry.opacity.at(-1), `${zone} never clears`).toBe('0');
      }
    }
  });

  test('nothing composites additively', async ({ page }) => {
    const entries = await recordSwap(page, () => navigateTo(page, PROOF));

    const additive = entries.filter((entry) => entry.name.includes('-ua-mix-blend-mode-'));
    expect(additive, 'a mix-blend-mode animation survived into the swap').toEqual([]);
  });

  test('a reduced-motion reader gets no stagger at all', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const entries = await recordSwap(page, () => navigateTo(page, PROOF));

    expect(entries).toEqual([]);
  });
});
