/*
 * Route transition choreography, and what it is built out of.
 *
 * The swap is a per-zone stagger with two variants, selected by `data-nav` on
 * `<html>` — `jump` for a section jump, `pager` for a next/previous cell. This
 * spec drives real navigations and reads the animations the browser actually ran,
 * because three separate defects in this feature were each invisible to a
 * screenshot and to any assertion made against the stylesheet's source text:
 *
 *   1. Astro writes its default per-zone animation inside `@layer astro`, and an
 *      ancestor-qualified `html[data-nav='jump'] ::view-transition-old(body)` does
 *      not match the view-transition pseudo tree at all. The rule parses, reaches
 *      the CSSOM, and never applies.
 *   2. The router re-applies the incoming document's `<html>` attributes on
 *      `astro:after-swap`, deleting `data-nav` after it was written and before the
 *      pseudo tree reads it — so every pager hop ran the jump choreography.
 *   3. Astro's `astroFadeIn`/`astroFadeOut` bake `mix-blend-mode: plus-lighter`
 *      into their keyframes, which a staggered sequence cannot composite.
 *
 * So the assertions here are on the resolved animation list: the keyframe names,
 * their resolved delays, and the transform endpoints. A regression reintroduces
 * one of the three above as `astroFadeOut d=0` and these fail.
 */
import { expect, test } from '@playwright/test';
import { DESKTOP_VIEWPORT } from './support/toc.mjs';
import { navigateTo } from './support/navigation.mjs';

/** Every zone, in the order a jump reads the page: top to bottom. */
const EXIT_ORDER = ['rh', 'rail', 'body', 'pager-prev', 'pager-next'];

const PREFACE = '/00-preface/';
const PROOF = '/00-preface/02-how-to-prove-a-win/';

/* The swap is 810ms end to end; this covers the tail with room for a slow machine. */
const SETTLE = 2400;

/**
 * Start recording, navigate, and return every view-transition animation the
 * browser ran, de-duplicated.
 *
 * Recording starts BEFORE the click and reads `document.getAnimations()` on a
 * timer rather than after `navigateTo` returns, because `navigateTo` waits for the
 * new pathname — by which point the swap has already finished and the pseudo tree
 * is gone. An animation whose keyframes have not resolved yet is skipped: the tree
 * is live for a frame or two before the engine will answer for it.
 */
const startRecorder = (page) =>
  page.evaluate(() => {
    const seen = new Set();
    globalThis.zoneTrace = seen;
    globalThis.zoneTraceId = setInterval(() => {
      for (const animation of document.getAnimations()) {
        const raw = animation.effect?.pseudoElement ?? '';
        if (!raw.includes('view-transition')) {
          continue;
        }
        const keyframes = animation.effect.getKeyframes();
        if (keyframes.length === 0) {
          continue;
        }
        const timing = animation.effect.getTiming();
        /*
         * The travel, read from the START of the keyframes.
         *
         * A zone's `from` is its far edge and its `to` is rest: an entering piece
         * begins at `translateX(-60px)` and lands at 0, a departing piece begins at
         * 0 and leaves at `-60px`. So the offset that encodes direction and distance
         * is the first one, and taking the last silently reports every zone as
         * having travelled nowhere. The two halves are kept separately because the
         * axis is the assertion: horizontal for the edges, vertical for the title.
         */
        const offsets = keyframes
          .map((keyframe) => /translate([XY])\((-?[\d.]+)px\)/u.exec(keyframe.transform ?? ''))
          .find(Boolean);
        const start = offsets[0] ?? null;
        seen.add(
          JSON.stringify({
            zone: raw.replace('::view-transition-', ''),
            name: animation.animationName,
            delay: timing.delay,
            opacity: keyframes.map((keyframe) => keyframe.opacity),
            axis: start?.[1] ?? null,
            travel: start?.[2] ?? null,
          }),
        );
      }
    }, 8);
  });

const readRecorder = (page) =>
  page.evaluate(() => {
    clearInterval(globalThis.zoneTraceId);
    return [...globalThis.zoneTrace].map((entry) => JSON.parse(entry));
  });

async function recordSwap(page, go) {
  await page.goto(PREFACE);
  await page.waitForTimeout(600);
  await startRecorder(page);
  await go();
  await page.waitForTimeout(SETTLE);
  return readRecorder(page);
}

/** `new(rail)` → `['new', 'rail']` */
const splitZone = (entry) => {
  const match = /^(\w+)\(([^)]*)\)$/u.exec(entry.zone);
  return match ? [match[1], match[2]] : [entry.zone, ''];
};

const half = (entries, side, zone) =>
  entries.filter((entry) => {
    const [kind, name] = splitZone(entry);
    return kind === side && name === zone;
  });

const delays = (entries, side, zone) => half(entries, side, zone).map((entry) => entry.delay);

/** `a[rel="next"]` on the current page, navigated for real. */
const pressNext = async (page) => {
  await page.locator('a[rel="next"]').first().click();
  await page.waitForFunction((from) => location.pathname !== from, PREFACE, { timeout: 15_000 });
};

/**
 * Assert that a set of edge zones travels the full distance on the horizontal axis
 * in the expected direction, and that the named centre zones do not move at all.
 *
 * Shared by the jump and the pager variants because the divergence is the one thing
 * they have in common: what differs between them is the centre's arrival, never the
 * furniture's departure.
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

const readTravel = (page) =>
  page.evaluate(() => {
    const computed = getComputedStyle(document.documentElement);
    return {
      travel: Number.parseFloat(computed.getPropertyValue('--zone-travel')),
      drop: Number.parseFloat(computed.getPropertyValue('--zone-drop')),
    };
  });

test.describe('the route swap', () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test('a section jump captures every zone and leaves in page order', async ({ page }) => {
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

  test('a section jump diverges, and the centre stays put', async ({ page }) => {
    const entries = await recordSwap(page, () => navigateTo(page, PROOF));
    const { travel } = await readTravel(page);

    expectDividedEdges(entries, 'old', travel, ['body', 'rh']);
  });
});

test.describe('the route swap, reversed', () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test('a section jump arrives in the reverse of the order it left', async ({ page }) => {
    const entries = await recordSwap(page, () => navigateTo(page, PROOF));
    const arrival = EXIT_ORDER.map((zone) => Math.min(...delays(entries, 'new', zone)));
    const reversed = arrival.every((value, index) => index === 0 || value < arrival[index - 1]);

    expect(
      reversed,
      `entrance is not reversed: ${EXIT_ORDER.map((z, i) => `${z}@${arrival[i]}`).join(' ')}`,
    ).toBe(true);
  });

  test('the entrance waits for the exit to finish', async ({ page }) => {
    const entries = await recordSwap(page, () => navigateTo(page, PROOF));

    const lastExit = Math.max(
      ...EXIT_ORDER.flatMap((zone) => half(entries, 'old', zone).map((e) => e.delay + 190)),
    );
    const firstArrival = Math.min(...EXIT_ORDER.flatMap((zone) => delays(entries, 'new', zone)));

    /* The dead beat. A reader gets a moment where the old page is simply gone,
       rather than one dissolve running through the other's midpoint. */
    expect(firstArrival).toBeGreaterThan(lastExit);
  });
});

test.describe('a pager hop', () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test('is anchored on the title, and only then', async ({ page }) => {
    const entries = await recordSwap(page, () => pressNext(page));
    const { drop } = await readTravel(page);

    const title = half(entries, 'new', 'title');
    const body = half(entries, 'new', 'body');

    /* The title drops in from above and the reading column follows it down. */
    for (const entry of [...title, ...body]) {
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
       two differ only in the title zone and in the body's entrance. */
    const pager = await recordSwap(page, () => pressNext(page));
    const jump = await recordSwap(page, () => navigateTo(page, PROOF));

    expect(half(pager, 'new', 'title')).not.toEqual([]);
    expect(half(jump, 'new', 'title')).toEqual([]);
    expect(delays(pager, 'new', 'body')).not.toEqual(delays(jump, 'new', 'body'));
  });
});

test.describe('the route swap, composited', () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test('every zone is opaque underneath and clears on the way out', async ({ page }) => {
    const entries = await recordSwap(page, () => navigateTo(page, PROOF));
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

    /* `plus-lighter` adds the two opacities, which is only correct while they sum
       to 1. A stagger cannot hold that, and on this paper the under-exposed frames
       render darker than either page. */
    const additive = entries.filter((entry) => entry.name.includes('-ua-mix-blend-mode-'));
    expect(additive, 'a mix-blend-mode animation survived into the swap').toEqual([]);
  });

  test('a reduced-motion reader gets no stagger at all', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const entries = await recordSwap(page, () => navigateTo(page, PROOF));

    expect(entries).toEqual([]);
  });
});
