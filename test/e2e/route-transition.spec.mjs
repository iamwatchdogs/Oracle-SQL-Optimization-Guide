/*
 * Route transition: the departure, and the furniture's divergence.
 *
 * The swap has two variants, selected by `data-nav` on `<html>` — `jump` for a section
 * jump, `pager` for a next/previous cell. Everything here is asserted on the animations
 * the browser actually ran, because the first three defects in this feature were each
 * invisible to a screenshot and to any check against the stylesheet's text:
 *
 *   1. Astro writes its default per-zone animation inside `@layer astro`, and an
 *      ancestor-qualified `html[data-nav='jump'] ::view-transition-old(body)` does not
 *      match the view-transition pseudo tree at all. The rule parses, reaches the CSSOM,
 *      and never applies.
 *   2. The router deletes `data-nav` on `astro:after-swap`, so every pager hop ran the
 *      jump choreography.
 *   3. `plus-lighter` blending, which a staggered sequence cannot composite.
 *
 * What leaves the page and where each piece goes is here. What comes back, and after which
 * pause, is in `route-transition-arrival.spec.mjs` — the two are separate files because
 * the two halves of the choreography were allowed to drift apart once, and a single spec
 * file is what let that go unnoticed. Compositing is in
 * `route-transition-compositing.spec.mjs`. The recorder is `support/zone-swap.mjs`, the
 * ladder arithmetic is `support/ladder.mjs`, and the assertions are
 * `support/zone-assertions.mjs`.
 */
import { test } from '@playwright/test';
import { DESKTOP_VIEWPORT } from './support/toc.mjs';
import { navigateTo } from './support/navigation.mjs';
import { PREFACE, PROOF, readTravel, recordSwap } from './support/zone-swap.mjs';
import {
  expectBothHalvesCaptured,
  expectDividedEdges,
  expectOrderedOverlap,
} from './support/zone-assertions.mjs';

/** Press the next cell for real, so the router resolves a genuine pager navigation. */
const pressNext = async (page) => {
  await page.locator('a[rel="next"]').first().click();
  await page.waitForFunction((from) => location.pathname !== from, PREFACE, { timeout: 15_000 });
};

test.describe('a section jump', () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test('captures every zone, both halves, and leaves in page order', async ({ page }) => {
    const entries = await recordSwap(page, () => navigateTo(page, PROOF));
    const { duration } = await readTravel(page);

    /*
     * Both halves of every zone, and the departure's order and overlap, in one claim.
     * A zone captured on one side only would make every ordering assertion below pass
     * while describing a swap that cannot happen.
     */
    expectBothHalvesCaptured(entries);
    expectOrderedOverlap(entries, duration);
  });

  test('diverges at its edges, and the centre stays put', async ({ page }) => {
    const entries = await recordSwap(page, () => navigateTo(page, PROOF));
    const { travel } = await readTravel(page);

    expectDividedEdges(entries, 'old', travel, ['body', 'rh']);
    /* And on the way back in, the edges return along the axis they left on. */
    expectDividedEdges(entries, 'new', travel, ['body', 'rh']);
  });
});

test.describe('a pager hop', () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test('leaves exactly as a jump does, and returns its edges the same way', async ({ page }) => {
    const entries = await recordSwap(page, () => pressNext(page));
    const { duration, travel } = await readTravel(page);

    /*
     * The departure is identical to a jump's. A pager hop differs only in how its centre
     * comes back, which `route-transition-arrival.spec.mjs` asserts — so the arriving half
     * is checked here for its edges alone, with no centre list, because the pager's centre
     * DOES travel on the way in and the stillness clause would fail on the one zone it
     * does not hold for.
     */
    expectBothHalvesCaptured(entries);
    expectOrderedOverlap(entries, duration);
    expectDividedEdges(entries, 'old', travel, ['body']);
    expectDividedEdges(entries, 'new', travel);
  });
});
