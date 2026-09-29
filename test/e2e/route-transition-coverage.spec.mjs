/*
 * What each page's zones actually cover.
 *
 * `route-transition.spec.mjs` asserts the choreography ran; `route-transition-arrival.spec.mjs`
 * asserts it ran in the right order with a pause between. Neither can see a zone that is
 * declared on the wrong element, because the animation it produces is perfect. This file is
 * about the third question: is the zone pointed at anything a reader would see.
 *
 * The defect this exists to catch shipped as a clean bill of health. `body-home` was on the
 * home page's `<main>`, which is the prose at y=1535 — below the fold. The title block, the
 * abstract, the primary control and the nine-row contents list are that element's SIBLINGS, so
 * 93.0% of the first viewport fell into `root`, which is pinned at opacity 1. Measured: the
 * home page painted at full strength from t=0 of a section→home swap, underneath a section
 * page still coming apart, with the two layouts interleaved glyph for glyph and the nominal
 * dead beat entirely occupied by opaque `root`.
 *
 * A section page never showed it, because a section's `<main>` does hold its whole reading
 * column. That asymmetry is the lesson: the zone was on the same kind of element on both
 * pages, and only one of them meant anything by it.
 *
 * This is a coverage test and not a geometry test. It asks how much of the first viewport
 * some zone paints, not whether a box has particular dimensions — dimensions are a
 * consequence of the layout and change for unrelated reasons, whereas "a zone covers almost
 * nothing" is a defect on its own terms.
 */
import { expect, test } from '@playwright/test';
import { DESKTOP_VIEWPORT } from './support/toc.mjs';
import { PREFACE } from './support/zone-swap.mjs';
import {
  HOME_ZONES,
  SECTION_ZONES,
  readIsInsideAZone,
  readViewportCoverage,
  readZoneNames,
} from './support/zone-coverage.mjs';

/**
 * The floor for "a zone is pointed at something worth animating".
 *
 * Deliberately low, and only for the zones that are small BY DESIGN: the running head is an
 * 18px-tall strip of mono metadata and the pager cells sit below the fold on a long page, so
 * neither is ever going to take a meaningful share of a first viewport and demanding one
 * would be demanding a layout change. The zones that must be large are asserted as such, by
 * name, in `expectDominantZone`.
 *
 * What this floor exists to catch is the opposite failure — a zone correctly named on an
 * element that is off-screen, empty, or one pixel tall, which would satisfy any test that
 * only asks whether the attribute is present.
 */
const MINIMUM_SHARE = 0.5;

/**
 * Zones the grid cannot see, and why each is not a defect.
 *
 * The grid samples 240 points, so a zone thinner than one cell row — roughly 75px at this
 * viewport — can fall between two rows and measure zero. `rh` is an 18px strip of mono
 * metadata by design; the pager cells sit at the foot of a 21,000px page. Neither is a broken
 * zone and neither should be forced to become one, so they are excluded from the floor rather
 * than the floor lowered to accommodate them: `body` and `body-home` are the zones that have
 * to be large, and `expectDominantZone` says so by name.
 *
 * A zone appearing here does not stop it being asserted in `expectNames` — it is still a zone
 * the swap depends on, and losing it is still a failure.
 */
const BELOW_GRID = new Set(['rh', 'pager-prev', 'pager-next']);

/**
 * The one zone per page that has to BE the first viewport.
 *
 * A page can be mostly covered by zones and still have its dominant one in the wrong place,
 * so the important claim is not the union but this single region. On a section page it is
 * `body`, the reading column. On home it is `body-home`, which is the wrapper that holds the
 * title block, the abstract, the primary control and the contents list — the whole first
 * viewport, which is exactly what it was NOT before the wrapper.
 */
const DOMINANT_ZONE = {
  [PREFACE]: 'body',
  '/': 'body-home',
};

/** The share the dominant zone must take, as a floor on "this zone is the page". */
const DOMINANT_SHARE = 40;

/**
 * How much of the first viewport each page is allowed to hand to `root`.
 *
 * `root` is the residual — whatever no zone covers — and it is pinned at opacity 1, so
 * anything a reader sees there arrives and departs instantly no matter what the choreography
 * does. A section page is expected to hand it a real share: the header, the footer, the
 * gutters and the background are all furniture, and the design intends the header to hold
 * still across a swap. The home page is not that case — its entire first viewport is content,
 * and every pixel of it in `root` is a pixel that arrives at full opacity on top of the
 * departing page. Measured, these two pages sat at 19.7% and 93.0%.
 */
const ROOT_CEILINGS = [
  [PREFACE, 40],
  ['/', 20],
];

test.describe('what the zones cover — a section page', () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test('names its zones, and they cover its first viewport', async ({ page }) => {
    await page.goto(PREFACE);

    expectNames(page, SECTION_ZONES);
    expectCoverage(page, SECTION_ZONES);
    await expectDominantZone(page, PREFACE);
  });
});

test.describe('what the zones cover — the home page', () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test('names its zones, and they cover its first viewport', async ({ page }) => {
    await page.goto('/');

    /*
     * The test that would have caught the bug.
     *
     * `body-home` is asserted as a name AND as a region. The name alone was never enough —
     * it was present, on an element, and a correct attribute. The coverage figure is what
     * says whether the zone is the page or a fragment of it, and it is the property that went
     * unmeasured for as long as the zone sat on the wrong element.
     */
    expectNames(page, HOME_ZONES);
    expectCoverage(page, HOME_ZONES);
    await expectDominantZone(page, '/');
  });

  test('the zone wraps the title block rather than sitting below it', async ({ page }) => {
    await page.goto('/');

    /*
     * Stated as a structural claim, because that is what a fix has to change and it fails
     * long before the coverage number moves: putting the name on a wrapper around the title
     * block is what repairs the swap, and putting it back on the `<main>` is what breaks it.
     *
     * `#book-title` is the display heading, so if it is inside the home zone's subtree the
     * zone covers the top of the page by construction rather than by luck of which element
     * happened to be named.
     */
    expect(
      await readIsInsideAZone(page, '#book-title'),
      'the display title is not inside any named zone, so the home arrival is choreographed ' +
        'around a region the reader cannot see',
    ).toBe(true);
  });
});

test.describe('what the zones leave to the root snapshot', () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test('no page hands most of its first viewport to a region that never moves', async ({
    page,
  }) => {
    for (const [route, ceiling] of ROOT_CEILINGS) {
      await page.goto(route);
      const { coveredByRoot } = await readViewportCoverage(page);

      expect(
        coveredByRoot,
        `${route} hands ${coveredByRoot.toFixed(1)}% of its first viewport to root, which is ` +
          'pinned opaque and never appears to move',
      ).toBeLessThan(ceiling);
    }
  });
});

/**
 * The zone that is supposed to BE the page actually is the page.
 *
 * Stated separately from the per-zone floor because the union is not the claim. Seven zones
 * can together cover a viewport while the one that matters sits below the fold, which is
 * precisely the defect: `body-home` covered 0% of the home page's first viewport and the
 * other five zones covered the remaining 7%, so every per-zone check passed and 93% of the
 * page arrived through `root`.
 */
async function expectDominantZone(page, route) {
  const zone = DOMINANT_ZONE[route];
  const share = (await readViewportCoverage(page)).named[zone] ?? 0;

  expect(
    share,
    `${route}: zone ${zone} is meant to be the first viewport and covers ${share.toFixed(1)}% ` +
      'of it, so the page arrives through root instead',
  ).toBeGreaterThan(DOMINANT_SHARE);
}

/**
 * The page declares at least the expected zones.
 *
 * `arrayContaining` rather than equality, because a page may legitimately name more than the
 * zones this file lists — `meta` and `body-home` coexist with nothing else on home, but the
 * catch-all's section branch names six. The check that matters is that nothing expected is
 * missing, since a zone that loses its name stops taking part in the stagger.
 *
 * The `scoped` count is asserted alongside, and it is what makes an empty result readable. A
 * reader that found no rules and a page that named nothing look identical from here, so the
 * build's own scoped rules are checked to exist first.
 */
async function expectNames(page, expected) {
  const { names, scoped } = await readZoneNames(page);

  expect(scoped, 'the build emitted no scoped view-transition-name rules to read').toBeGreaterThan(
    0,
  );
  expect(names, `expected zones ${expected.join(', ')}`).toEqual(expect.arrayContaining(expected));

  return names;
}

/**
 * Every expected zone covers a share of the viewport worth animating.
 *
 * The per-zone floor is what makes this more than a name check: a zone can be correctly named
 * on an element that is off-screen or one pixel tall, and would pass any test that only asks
 * whether the attribute is there.
 */
async function expectCoverage(page, zones) {
  const coverage = await readViewportCoverage(page);

  for (const zone of zones.filter((name) => !BELOW_GRID.has(name))) {
    expect(
      coverage.named[zone] ?? 0,
      `zone ${zone} covers ${(coverage.named[zone] ?? 0).toFixed(1)}% of the first viewport`,
    ).toBeGreaterThan(MINIMUM_SHARE);
  }

  return coverage;
}
