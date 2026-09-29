/*
 * Route transition: the arrival, and the pause that separates it from the departure.
 *
 * Split from `route-transition.spec.mjs`, which covers the departure and the furniture's
 * divergence. What is here is the half of the swap that was missing: the stylesheet's
 * arrival delays and keyframes existed for a while, unreferenced, and every assertion in
 * this area was about the pieces leaving. Both halves of a choreography have to be pinned
 * separately, because they can drift — and did, when a retime moved the departure from
 * 190ms to 240ms and left the arrival ladder on its old numbers.
 *
 * The recorder is `support/zone-swap.mjs`, the ladder arithmetic is `support/ladder.mjs`,
 * and the assertions are `support/zone-assertions.mjs`.
 */
import { expect, test } from '@playwright/test';
import { DESKTOP_VIEWPORT } from './support/toc.mjs';
import { navigateTo } from './support/navigation.mjs';
import { PREFACE, PROOF, half, readTravel, recordSwap } from './support/zone-swap.mjs';
import { ladderBounds } from './support/ladder.mjs';
import {
  expectBothHalvesCaptured,
  expectDifferentNavigations,
  expectReversedArrival,
} from './support/zone-assertions.mjs';

/** Press the next cell for real, so the router resolves a genuine pager navigation. */
const pressNext = async (page) => {
  await page.locator('a[rel="next"]').first().click();
  await page.waitForFunction((from) => location.pathname !== from, PREFACE, { timeout: 15_000 });
};

/** `--zone-beat` as the browser resolved it, in milliseconds. */
const readBeat = (page) =>
  page.evaluate(() =>
    Number(
      getComputedStyle(document.documentElement)
        .getPropertyValue('--zone-beat')
        .trim()
        .replace('ms', ''),
    ),
  );

test.describe('a section jump — the arrival', () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test('arrives in the exact reverse of the order it left', async ({ page }) => {
    const entries = await recordSwap(page, () => navigateTo(page, PROOF));

    expectBothHalvesCaptured(entries);
    expectReversedArrival(entries);
  });

  test('every arrival waits for every departure, and then holds a beat', async ({ page }) => {
    const entries = await recordSwap(page, () => navigateTo(page, PROOF));
    const { duration } = await readTravel(page);
    const { gap } = ladderBounds(entries, duration);

    /*
     * The dead beat is the pause, and it is load-bearing: without it the departure and the
     * arrival overlap and the swap reads as a slide rather than as a page changing.
     *
     * Two properties, and neither implies the other. Nothing may start arriving until the
     * LAST thing has finished leaving — the foot of the page, not the top, and
     * `ladderBounds` pairs those two ends deliberately because the ladders run in opposite
     * orders and a check against the running head alone would pass however far the ends had
     * drifted. And the gap must equal the stylesheet's own `--zone-beat`, because an
     * implementation that satisfied the first by setting the arrival equal to the last exit
     * would pass it and lose the beat entirely.
     */
    expect(gap, 'the new page starts arriving before the old page has gone').toBeGreaterThan(0);
    expect(gap, 'the pause is not the beat the stylesheet declares').toBe(await readBeat(page));
  });

  test('the arriving column dissolves where it stands', async ({ page }) => {
    const entries = await recordSwap(page, () => navigateTo(page, PROOF));

    /* On a jump the centre resolves in place. Travelling is the pager's distinction. */
    for (const entry of half(entries, 'new', 'body')) {
      expect(entry.axis, 'the jump arrival travels, so it is the pager variant').toBeNull();
    }
  });
});

test.describe('a pager hop — the arriving centre', () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test('rises into place, and dissolves on the way', async ({ page }) => {
    const entries = await recordSwap(page, () => pressNext(page));
    const { drop } = await readTravel(page);
    const body = half(entries, 'new', 'body');

    expect(body, 'the pager hop no longer animates the reading column').not.toEqual([]);
    for (const entry of body) {
      expect(entry.name).toBe('zone-in-up');
      expect(entry.axis, 'the pager column rises on the wrong axis').toBe('Y');
      expect(entry.travel, 'the pager column rises by the wrong distance').toBe(String(-drop));
      /*
       * It dissolves as well as travelling, and that is a change of contract rather than a
       * detail. It used to be transform-only, on the reasoning that a transform moves a
       * snapshot that is already painted while an opacity animation withholds one —
       * reasoning that was correct about opacity and wrong about the effect. A piece that is
       * simply there through the pause is not participating in it, so the pager hop would
       * have been the one navigation with no dead beat at all.
       */
      expect(entry.opacity.at(0), 'the pager column is painted before the beat').toBe('0');
      expect(entry.opacity.at(-1), 'the pager column never becomes opaque').toBe('1');
    }
  });

  test('the jump does not rise', async ({ page }) => {
    const entries = await recordSwap(page, () => navigateTo(page, PROOF));

    for (const entry of half(entries, 'new', 'body')) {
      expect(entry.name, 'the jump arrival has become the pager arrival').not.toBe('zone-in-up');
    }
  });

  test('is a different navigation from a jump', async ({ page }) => {
    const pager = await recordSwap(page, () => pressNext(page));
    const jump = await recordSwap(page, () => navigateTo(page, PROOF));

    expectDifferentNavigations(pager, jump, 'new', 'body');
  });
});

test.describe('a pager hop — the same rhythm as a jump', () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test('shares the dead beat, and arrives at the same time', async ({ page }) => {
    /*
     * Both swaps are recorded BEFORE the tokens are read, and the order matters.
     * `readTravel` resolves `--zone-dur` off `document.documentElement`, so calling it
     * first reads them from whatever the page is on before `recordSwap` navigates —
     * `about:blank` on a fresh context, which has no custom properties, and every
     * assertion below then compares against `NaN`.
     */
    const pager = await recordSwap(page, () => pressNext(page));
    const jump = await recordSwap(page, () => navigateTo(page, PROOF));
    const { duration } = await readTravel(page);
    const gapOf = (entries) => ladderBounds(entries, duration).gap;

    /*
     * The property that makes the two variants one design rather than two: the pager
     * differs from a jump in how the centre arrives and in nothing else. Same ladder, same
     * pause, same total, so a reader moving by either route gets one rhythm.
     *
     * Asserted as EQUALITY against a jump's own measured bounds, not as "> 0". The weak
     * version is satisfied by a pager hop that waited twice as long, which would have
     * quietly become a different and slower choreography rather than a variant of one.
     */
    expect(gapOf(pager), 'the pager hop does not hold the beat').toBe(await readBeat(page));
    expect(gapOf(pager), 'the pager hop and a jump are no longer the same rhythm').toBe(
      gapOf(jump),
    );
  });
});

test.describe('the trace itself', () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test('recorded every half of every zone, on either kind of navigation', async ({ page }) => {
    for (const go of [() => navigateTo(page, PROOF), () => pressNext(page)]) {
      expectBothHalvesCaptured(await recordSwap(page, go));
    }
  });
});
