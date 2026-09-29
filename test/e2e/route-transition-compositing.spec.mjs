/*
 * Compositing rules for the route swap.
 *
 * Split from `route-transition.spec.mjs`, which is about choreography — which zone goes
 * when, and in which direction. These are the two properties that decide whether a
 * staggered swap is legible at all, and both were shipped broken once.
 *
 * Both halves of every zone animate opacity, in opposite directions. That is what makes
 * the dead beat work: the arriving half starts at zero and the departing half ends at
 * zero, so at the centre of the swap nothing in that zone is painted at all. It is the
 * point of the choreography rather than a defect in it — the page comes apart, pauses, and
 * builds itself back up in the opposite order.
 *
 * Nothing composites additively. Astro's `astroFadeIn` and `astroFadeOut` bake
 * `mix-blend-mode: plus-lighter` into their keyframes, and addition is only correct while
 * the two opacities sum to 1 — which a stagger never holds. During the dead beat they sum
 * to ZERO, and those frames showed the paper through. This paper is `#0c0c0e`, so the
 * middle of every chapter change dimmed the page and brought it back.
 */
import { expect, test } from '@playwright/test';
import { DESKTOP_VIEWPORT } from './support/toc.mjs';
import { navigateTo } from './support/navigation.mjs';
import { PROOF, recordSwap, splitZone } from './support/zone-swap.mjs';
import {
  expectBothHalvesCaptured,
  expectEveryZoneClears,
  expectEveryZoneWithholdsThenArrives,
} from './support/zone-assertions.mjs';

/**
 * Assert that the root pseudo is present in the trace and is not being driven by the
 * UA's additive blend.
 *
 * The UA puts `-ua-mix-blend-mode-plus-lighter` on `::view-transition-old/new(root)`
 * and nowhere else, so `root` is the one pseudo that carries the additive blend whether
 * or not it has a keyframe of its own. Covering the six named zones left it running, and
 * `root` is the pseudo that holds the gutter between them — so the blend was being added
 * to the one region nothing else painted over. It passed while the named zones were
 * correct because a trace that happened to miss `root` is indistinguishable from a clean
 * one.
 *
 * Split out because that reasoning is worth more than the three lines that express it,
 * and the test names the trap better than a nested loop does.
 */
function expectNeutralRoot(entries) {
  /* The recorded zone is `old(root)` / `new(root)`, not `root` — `splitZone` is what
     separates the half from the name, and a filter on the raw string finds neither. */
  const root = entries.filter((entry) => splitZone(entry)[1] === 'root');
  expect(root, 'the root pseudo did not appear in the trace at all').not.toEqual([]);
  for (const entry of root) {
    expect(entry.name, 'the UA blend is still driving the root pseudo').not.toContain(
      'mix-blend-mode',
    );
  }
}

/*
 * Record a real jump and prove the trace can carry the claim about it.
 *
 * This pair of guards exists because the assertions below once passed while describing
 * nothing. With the arrival animation absent, no arriving half produced an `Animation`
 * object, so the zone list filtered itself down to empty and every `for` loop over it ran
 * zero times — correct assertions, absent guarantee, reported as green.
 *
 * A recorder that captured nothing returns an empty array, and an empty array satisfies
 * every loop below vacuously. So presence is asserted up front: if the recorder or the
 * browser stops reporting animations, this fails loudly instead of turning the rest of
 * the file into decoration.
 */
async function recordEveryZone(page) {
  const entries = await recordSwap(page, () => navigateTo(page, PROOF));

  expect(
    entries.length,
    'nothing was recorded, so no assertion in this file means anything',
  ).toBeGreaterThan(0);
  /*
   * Presence is asserted before any opacity is, because a missing half and a missing
   * opacity animation are different failures: one means the zone is not taking part at all,
   * the other means it is participating with the wrong keyframes.
   */
  expectBothHalvesCaptured(entries);

  return entries;
}

test.describe('the route swap, composited', () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test('every zone withholds itself on the way in and clears on the way out', async ({ page }) => {
    const entries = await recordEveryZone(page);

    expectEveryZoneWithholdsThenArrives(entries);
    expectEveryZoneClears(entries);
  });

  test('nothing composites additively', async ({ page }) => {
    const entries = await recordEveryZone(page);
    const additive = entries.filter((entry) => entry.name.includes('-ua-mix-blend-mode-'));

    /* Every pseudo, not just the ones this project animates — see `expectNeutralRoot`. */
    expect(additive, 'a mix-blend-mode animation survived into the swap').toEqual([]);
  });

  test('the root pseudo is pinned to normal, not left to the UA', async ({ page }) => {
    expectNeutralRoot(await recordSwap(page, () => navigateTo(page, PROOF)));
  });

  test('a reduced-motion reader gets no stagger at all', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const entries = await recordSwap(page, () => navigateTo(page, PROOF));

    expect(entries).toEqual([]);
  });
});
