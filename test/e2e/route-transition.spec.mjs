/*
 * Route transition choreography: which zone goes when, and in which direction.
 *
 * The swap has two variants, selected by `data-nav` on `<html>` — `jump` for a
 * section jump, `pager` for a next/previous cell. Everything here is asserted on the
 * animations the browser actually ran, because the first three defects in this
 * feature were each invisible to a screenshot and to any check against the
 * stylesheet's text:
 *
 *   1. Astro writes its default per-zone animation inside `@layer astro`, and an
 *      ancestor-qualified `html[data-nav='jump'] ::view-transition-old(body)` does not
 *      match the view-transition pseudo tree at all. The rule parses, reaches the
 *      CSSOM, and never applies.
 *   2. The router deletes `data-nav` on `astro:after-swap`, so every pager hop ran
 *      the jump choreography.
 *   3. `plus-lighter` blending, which a staggered sequence cannot composite.
 *
 * The recorder and its helpers are in `support/zone-swap.mjs`; the compositing rules
 * are in `route-transition-compositing.spec.mjs`.
 */
import { expect, test } from '@playwright/test';
import { DESKTOP_VIEWPORT } from './support/toc.mjs';
import { navigateTo } from './support/navigation.mjs';
import {
  EXIT_ORDER,
  PREFACE,
  PROOF,
  delays,
  half,
  readTravel,
  recordSwap,
} from './support/zone-swap.mjs';

/** Press the next cell for real, so the router resolves a genuine pager navigation. */
const pressNext = async (page) => {
  await page.locator('a[rel="next"]').first().click();
  await page.waitForFunction((from) => location.pathname !== from, PREFACE, { timeout: 15_000 });
};

/**
 * Assert that a set of edge zones travels the full distance on the horizontal axis
 * in the expected direction, and that the named centre zones do not move at all.
 *
 * Shared by the two variants because the divergence is what they have in common:
 * what differs between them is the centre's arrival, never the furniture's
 * departure.
 */
function expectDividedEdges(entries, side, distance, centres = []) {
  for (const [zone, direction] of [
    ['rail', -1],
    ['pager-prev', -1],
    ['pager-next', 1],
  ]) {
    const zoneEntries = half(entries, side, zone);
    expect(zoneEntries, `the ${side} half lost the ${zone} zone`).not.toEqual([]);
    for (const entry of zoneEntries) {
      expect(entry.axis, `${zone} does not travel on the horizontal axis`).toBe('X');
      expect(entry.travel, `${zone} does not leave ${direction < 0 ? 'left' : 'right'}`).toBe(
        String(direction * distance),
      );
    }
  }
  for (const zone of centres) {
    for (const entry of half(entries, side, zone)) {
      expect(entry.axis, `${zone} travels, and must not`).toBeNull();
    }
  }
}

test.describe('a section jump', () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test('captures every zone and leaves in page order', async ({ page }) => {
    const entries = await recordSwap(page, () => navigateTo(page, PROOF));

    for (const zone of EXIT_ORDER) {
      expect(half(entries, 'old', zone), `zone ${zone} was not captured`).not.toEqual([]);
    }

    const order = EXIT_ORDER.map((zone) => Math.min(...delays(entries, 'old', zone)));
    const ascending = order.every((value, index) => index === 0 || value > order[index - 1]);

    expect(
      ascending,
      `exit is not top-to-bottom: ${EXIT_ORDER.map((z, i) => `${z}@${order[i]}`).join(' ')}`,
    ).toBe(true);
    expect(order[0]).toBe(0);
  });

  test('diverges at its edges, and the centre stays put', async ({ page }) => {
    const entries = await recordSwap(page, () => navigateTo(page, PROOF));
    const { travel } = await readTravel(page);

    expectDividedEdges(entries, 'old', travel, ['body', 'rh']);
  });
});

test.describe('a section jump, reversed', () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test('arrives in the reverse of the order it left', async ({ page }) => {
    const entries = await recordSwap(page, () => navigateTo(page, PROOF));
    const arrival = EXIT_ORDER.map((zone) => Math.min(...delays(entries, 'new', zone)));
    const reversed = arrival.every((value, index) => index === 0 || value < arrival[index - 1]);

    expect(
      reversed,
      `entrance is not reversed: ${EXIT_ORDER.map((z, i) => `${z}@${arrival[i]}`).join(' ')}`,
    ).toBe(true);
  });

  test('waits for the exit to finish before it begins', async ({ page }) => {
    const entries = await recordSwap(page, () => navigateTo(page, PROOF));

    const lastExit = Math.max(
      ...EXIT_ORDER.flatMap((zone) => half(entries, 'old', zone).map((entry) => entry.delay + 190)),
    );
    const firstArrival = Math.min(...EXIT_ORDER.flatMap((zone) => delays(entries, 'new', zone)));

    /* The dead beat. A reader gets a moment where the old page is simply gone,
       rather than one dissolve running through the other's midpoint. */
    expect(firstArrival).toBeGreaterThan(lastExit);
  });
});

test.describe('a pager hop', () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test('is anchored on the title, and the column follows it down', async ({ page }) => {
    const entries = await recordSwap(page, () => pressNext(page));
    const { drop } = await readTravel(page);

    for (const entry of [...half(entries, 'new', 'title'), ...half(entries, 'new', 'body')]) {
      expect(entry.name, 'the pager arrival is not anchored from above').toBe('zone-in-up');
      expect(entry.axis).toBe('Y');
      expect(entry.travel).toBe(String(-drop));
    }
    expect(Math.min(...delays(entries, 'new', 'title'))).toBeLessThan(
      Math.min(...delays(entries, 'new', 'body')),
    );
  });

  test('still diverges at its edges', async ({ page }) => {
    const entries = await recordSwap(page, () => pressNext(page));
    const { travel } = await readTravel(page);

    expectDividedEdges(entries, 'new', travel);
  });

  test('is not the same animation as a jump', async ({ page }) => {
    /* The regression this pins: `data-nav` is deleted by the router on
       `astro:after-swap`, so a pager hop silently ran the jump choreography. The
       two differ only in the title zone and the body's entrance, which is exactly
       what collapses them into one indistinguishable trace. */
    const pager = await recordSwap(page, () => pressNext(page));
    const jump = await recordSwap(page, () => navigateTo(page, PROOF));

    expect(half(pager, 'new', 'title')).not.toEqual([]);
    expect(half(jump, 'new', 'title')).toEqual([]);
    expect(delays(pager, 'new', 'body')).not.toEqual(delays(jump, 'new', 'body'));
  });
});
