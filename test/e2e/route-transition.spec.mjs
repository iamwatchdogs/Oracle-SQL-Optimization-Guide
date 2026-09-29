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

  test('leaves the page in order, so it peels apart rather than vanishing', async ({ page }) => {
    const entries = await recordSwap(page, () => navigateTo(page, PROOF));
    const { duration } = await readTravel(page);

    /*
     * The order is entirely in the departure.
     *
     * There is no reverse-order arrival to assert any more, and that is the point: the
     * arriving halves are painted from the first frame, because a staggered arrival
     * leaves the middle of the swap unpainted. The stagger you see is the old pieces
     * leaving one at a time, and for that to read as a page coming apart rather than a
     * page switching off, they have to leave in order and overlap each other.
     */
    const start = EXIT_ORDER.map((zone) => Math.min(...delays(entries, 'old', zone)));
    const ascending = start.every((value, index) => index === 0 || value > start[index - 1]);
    expect(ascending, `exit is not top-to-bottom: ${start.join(', ')}`).toBe(true);

    /* Consecutive pieces overlap, so there is always something still leaving. */
    for (let i = 1; i < EXIT_ORDER.length; i += 1) {
      const previousEnds = start[i - 1] + duration;
      expect(start[i], `${EXIT_ORDER[i]} starts after ${EXIT_ORDER[i - 1]} has gone`).toBeLessThan(
        previousEnds,
      );
    }
  });
});

test.describe('a pager hop', () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test('rises into place, transform only', async ({ page }) => {
    const entries = await recordSwap(page, () => pressNext(page));
    const { drop } = await readTravel(page);
    const body = half(entries, 'new', 'body');

    expect(body, 'the pager hop no longer animates the reading column').not.toEqual([]);
    for (const entry of body) {
      expect(entry.name).toBe('zone-rise');
      expect(entry.axis).toBe('Y');
      expect(entry.travel).toBe(String(-drop));
      /* A transform moves a painted snapshot; it must not withhold one. */
      expect(entry.delay).toBe(0);
    }
  });

  test('the jump does not move the arriving column', async ({ page }) => {
    const entries = await recordSwap(page, () => navigateTo(page, PROOF));

    /* On a jump the arriving page is simply there. The difference between the two
       variants is the departure, and the pager's rise — not the arrival timing. */
    for (const entry of half(entries, 'new', 'body')) {
      expect(entry.name).not.toBe('zone-rise');
      expect(entry.delay).toBe(0);
    }
  });

  test('still peels apart at its edges', async ({ page }) => {
    const entries = await recordSwap(page, () => pressNext(page));
    const { travel } = await readTravel(page);

    /* The divergence is entirely in the departure now, and it is the departure that
       made a pager hop feel like a step. */
    expectDividedEdges(entries, 'old', travel);
  });

  test('is a different navigation from a jump', async ({ page }) => {
    const pager = await recordSwap(page, () => pressNext(page));
    const jump = await recordSwap(page, () => navigateTo(page, PROOF));

    expect(half(pager, 'new', 'body').map((e) => e.name)).not.toEqual(
      half(jump, 'new', 'body').map((e) => e.name),
    );
  });
});
