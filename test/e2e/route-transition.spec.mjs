/*
 * Route transition choreography, and the compositing bug that was hiding in it.
 *
 * Two failures were measured here, on the built site, with `document.getAnimations()`
 * during a swap.
 *
 * The first was a desynchronisation. The UA contributed its own
 * `::view-transition-group(*)` geometry animation at 250ms linear, while
 * `fade({ duration: '0.18s' })` faded the snapshots at 180ms on an eased curve — so
 * the shared `page-title` snapshot was still moving and scaling on a linear track
 * 70ms after the page it belonged to had finished arriving. Underneath that, the home
 * page's title-block entrance (500ms, up to a 240ms stagger, finishing at 740ms)
 * replayed on every client navigation, because the router re-creates that markup.
 *
 * The second was a dark dip, and it was invisible in every one of those measurements,
 * because it is a property of how the two snapshots composite rather than of either
 * one's timing. `fade()` bakes `mix-blend-mode: plus-lighter` into both keyframes, and
 * the UA adds a second `-ua-mix-blend-mode-plus-lighter` animation on top. Addition is
 * only correct while the two opacities sum to 1. Making the fade sequential — out
 * 180ms, then in 260ms after a 140ms delay — broke that invariant for the whole
 * 140ms, the frames were under-exposed, and the paper showed through them. The paper is
 * `#0c0c0e`, so the middle of every chapter change dimmed the page and brought it back.
 *
 * The fix keeps the sequential read and changes the compositing. The new page carries
 * no animation at all: it is a fully opaque snapshot UNDERNEATH the old one, and the
 * old page is uncovered rather than faded toward nothing. These tests assert that
 * structure, because the dip cannot be observed from timings at all.
 */

import { expect, test } from '@playwright/test';
import { DESKTOP_VIEWPORT } from './support/toc.mjs';

/*
 * The choreography, as constants rather than as prose.
 *
 * GEOMETRY  230ms on the project's ease-out: a title that arrives fast and settles
 *           reads as one motion, and it spans the swap rather than snapping at the
 *           end of the fade-out.
 * OUT       230ms, 50ms in: a beat where the old page is simply still there, then the
 *           removal, then the new page is revealed underneath it.
 * NEW       no animation. This is the load-bearing value in the file.
 * TOTAL     280ms. Above roughly 300ms a transition starts delaying the focus move
 *           and the route announcement, which is an accessibility cost.
 */
const GEOMETRY_CURVE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const LIFT_CURVE = 'cubic-bezier(0.4, 0, 0.6, 1)';
const GEOMETRY_MS = 230;
const OUT_MS = 230;
const OUT_DELAY_MS = 50;
const TOTAL_MS = OUT_DELAY_MS + OUT_MS;

const installViewTransitionRecorder = (page) =>
  page.evaluate(() => {
    const seen = new Set();
    globalThis.viewTransitionTrace = seen;
    const record = () => {
      for (const animation of document.getAnimations()) {
        const pseudo = animation.effect?.pseudoElement ?? '';
        if (!pseudo.includes('view-transition')) {
          continue;
        }
        const keyframes = animation.effect.getKeyframes();
        /* A view-transition animation is in the tree for a frame or two before its
           keyframes resolve, and an engine asked in that window answers with an
           empty list. Recording that would assert an easing of "none" against a
           curve that simply had not been reported yet; the next sample 20ms later
           carries the real keyframes, so skip the empty ones. */
        if (keyframes.length === 0) {
          continue;
        }
        const timing = animation.effect.getTiming();
        seen.add(
          JSON.stringify({
            pseudo,
            name: animation.animationName,
            duration: timing.duration,
            delay: timing.delay,
            easings: [...new Set(keyframes.map((keyframe) => keyframe.easing))],
            /* Opacity endpoints, which is where the compositing guarantee lives: a
               fade that ENDS at 0 fully clears, revealing whatever is under it. */
            opacity: keyframes.map((keyframe) => keyframe.opacity),
          }),
        );
      }
    };
    globalThis.viewTransitionTraceId = setInterval(record, 20);
  });

const readViewTransitionRecorder = (page) =>
  page.evaluate(() => {
    clearInterval(globalThis.viewTransitionTraceId);
    return [...globalThis.viewTransitionTrace].map((entry) => JSON.parse(entry));
  });

const navigateTo = (page, prefix) =>
  page.evaluate((href) => {
    const link = [...document.querySelectorAll('a')].find((anchor) =>
      anchor.getAttribute('href')?.startsWith(href),
    );
    link.click();
  }, prefix);

/** Settle the scroll first, or a scroll still easing out competes for the frames. */
const parkTheScroll = (page) =>
  page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, 3000);
  });

const risingCount = (page) =>
  page.evaluate(
    () =>
      document.getAnimations().filter((animation) => animation.animationName === 'rise-in').length,
  );

const byPseudo = (entries, fragment) => entries.filter((entry) => entry.pseudo.includes(fragment));

/** One swap's worth of recorded animations, sampled on a settled page. */
async function recordOneSwap(page) {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto('/');
  await page.waitForTimeout(700);
  await parkTheScroll(page);
  await page.waitForTimeout(300);

  await installViewTransitionRecorder(page);
  await navigateTo(page, '/00-preface/');
  await page.waitForTimeout(1500);
  return readViewTransitionRecorder(page);
}

/*
 * One duration and one curve per axis, and the whole swap inside 280ms.
 */
async function runsOneDurationAndOneCurvePerAxis({ page }) {
  const animations = await recordOneSwap(page);

  const groups = byPseudo(animations, '::view-transition-group');
  const olds = byPseudo(animations, '::view-transition-old');

  expect(groups.length).toBeGreaterThan(0);
  expect(olds.length).toBeGreaterThan(0);

  for (const group of groups) {
    expect(group.duration).toBe(GEOMETRY_MS);
    expect(group.delay).toBe(0);
    expect(group.easings).toEqual([GEOMETRY_CURVE]);
  }
  for (const old of olds) {
    expect(old.duration).toBe(OUT_MS);
    expect(old.delay).toBe(OUT_DELAY_MS);
    expect(old.easings).toEqual([LIFT_CURVE]);
  }
  /* Every animation the swap ran, geometry included, fits in the budget it claims. */
  for (const entry of animations) {
    expect(entry.delay + entry.duration).toBeLessThanOrEqual(TOTAL_MS);
  }
}

/*
 * The compositing guarantee, and the whole reason the dip is gone.
 *
 * Two things have to be true at once, and neither is visible in a duration:
 *
 *   1. the new page animates NOTHING, so it is opaque from the first frame. It is a
 *      filled page sitting underneath, not a page fading up from zero — which is
 *      what made the 140ms hole in the previous sequence.
 *   2. nothing composites additively. `plus-lighter` adds the two opacities, which is
 *      only right while they sum to 1; sequenced, they do not, and on this paper the
 *      under-exposed frames render darker than either page. The `animation` shorthand
 *      on the old page kills the UA's `-ua-mix-blend-mode-plus-lighter` alongside its
 *      fade, so there must be no such animation left in the tree.
 *
 * Then the old page's own fade has to END at zero opacity, or it never finishes
 * uncovering the page under it.
 */
async function keepsTheNewPageOpaqueUnderneathInsteadOfFadingBothThroughThePaper({ page }) {
  const animations = await recordOneSwap(page);

  const news = byPseudo(animations, '::view-transition-new');
  const olds = byPseudo(animations, '::view-transition-old');
  const blends = animations.filter((entry) => entry.name.includes('-ua-mix-blend-mode-'));

  expect(news).toEqual([]);
  expect(blends).toEqual([]);
  for (const old of olds) {
    expect(old.opacity.at(0)).toBe('1');
    expect(old.opacity.at(-1)).toBe('0');
  }
}

/*
 * Reduced motion means less of it, not the same motion with a longer clock.
 */
async function givesAReducedMotionReaderNoTransitionAtAll({ page }) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto('/');
  await page.waitForTimeout(500);
  await parkTheScroll(page);

  await installViewTransitionRecorder(page);
  await navigateTo(page, '/00-preface/');
  await page.waitForTimeout(900);
  const animations = await readViewTransitionRecorder(page);

  expect(animations).toEqual([]);
}

async function playsTheEntranceOncePerDocument({ page }) {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto('/');
  await page.waitForTimeout(200);

  /* The first viewport animates in, as specified. */
  await expect.poll(() => risingCount(page)).toBe(4);
  await page.waitForTimeout(900);

  /* One hop away and back again, and the title block is at rest both times: the
     router re-creates that markup, so without the `data-title-entrance` marker
     the entrance would replay on every arrival. */
  await navigateTo(page, '/00-preface/');
  await page.waitForTimeout(1200);
  expect(await risingCount(page)).toBe(0);

  await navigateTo(page, '/');
  await page.waitForTimeout(1400);
  expect(await risingCount(page)).toBe(0);
}

test.describe('the route swap', () => {
  test('runs one duration and one curve per axis, inside 280ms', runsOneDurationAndOneCurvePerAxis);
  test(
    'keeps the new page opaque underneath instead of fading both through the paper',
    keepsTheNewPageOpaqueUnderneathInsteadOfFadingBothThroughThePaper,
  );
  test(
    'gives a reduced-motion reader no transition at all',
    givesAReducedMotionReaderNoTransitionAtAll,
  );
  test(
    'plays the title-block entrance once per document, not once per arrival',
    playsTheEntranceOncePerDocument,
  );
});
