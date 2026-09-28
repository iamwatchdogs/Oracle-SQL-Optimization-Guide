/*
 * Route transition choreography, and what used to desynchronise it.
 *
 * Measured before the first fix, with `document.getAnimations()` during a swap:
 *
 *   ::view-transition-group(root)        250ms  linear
 *   ::view-transition-group(page-title)  250ms  linear
 *   ::view-transition-old/new(page-title) 180ms  cubic-bezier(.76,0,.24,1)
 *
 * So the shared `page-title` snapshot was moved and scaled on the UA's 250ms
 * linear curve while the page it belonged to cross-faded on a 180ms eased one — a
 * 70ms tail of title still in flight over a page that had already arrived. And
 * underneath that, the home page's title-block entrance (500ms with up to a 240ms
 * stagger, finishing at 740ms) replayed on every client navigation, so a reader
 * watched the abstract and the metadata margin drift into place long after the
 * page had already changed.
 */

import { expect, test } from '@playwright/test';
import { DESKTOP_VIEWPORT } from './support/toc.mjs';

/*
 * The choreography, as constants rather than as prose.
 *
 * Geometry 260ms on the project's ease-out: a title that arrives fast and settles
 *            reads as one motion, and it spans most of the swap rather than
 *            snapping at the end of the fade-out.
 * OUT       180ms accelerating: the old page leaves rather than thinning.
 * IN        260ms settling, starting 140ms in.
 * OVERLAP   40ms: the last of the fade-out against the first of the fade-in. A gap
 *            reads as a flash and a stutter; this much reads as a dissolve.
 */
const GEOMETRY_CURVE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const OUT_CURVE = 'cubic-bezier(0.4, 0, 1, 1)';
const IN_CURVE = 'cubic-bezier(0, 0, 0.2, 1)';
const GEOMETRY_MS = 260;
const OUT_MS = 180;
const IN_MS = 260;
const IN_DELAY_MS = 140;

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
        const easings = keyframes.map((keyframe) => keyframe.easing);
        seen.add(
          [
            pseudo,
            animation.animationName,
            animation.effect.getTiming().duration,
            animation.effect.getTiming().delay,
            ...easings,
          ].join('|'),
        );
      }
    };
    globalThis.viewTransitionTraceId = setInterval(record, 20);
  });

const readViewTransitionRecorder = (page) =>
  page.evaluate(() => {
    clearInterval(globalThis.viewTransitionTraceId);
    return [...globalThis.viewTransitionTrace];
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

const splitAnimations = (entries, prefix) =>
  entries.filter((entry) => entry.startsWith(prefix)).map((entry) => entry.split('|'));

async function runsOneDurationAndOneCurvePerAxis({ page }) {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto('/');
  await page.waitForTimeout(700);
  await parkTheScroll(page);
  await page.waitForTimeout(300);

  await installViewTransitionRecorder(page);
  await navigateTo(page, '/00-preface/');
  await page.waitForTimeout(1500);
  const animations = await readViewTransitionRecorder(page);

  const groups = splitAnimations(animations, '::view-transition-group');
  const outs = splitAnimations(animations, '::view-transition-old');
  const ins = splitAnimations(animations, '::view-transition-new');
  /* `-ua-mix-blend-mode-plus-lighter` animates `mix-blend-mode`, not opacity. It
     rides the same timing as the fade it shares an element with, which is why the
     longhands in `global.css` retime it too. */
  const blends = [...outs, ...ins].filter((entry) => entry[1].includes('-ua-mix-blend-mode-'));
  const opacities = [...outs, ...ins].filter((entry) => !entry[1].includes('-ua-mix-blend-mode-'));

  expect(groups.length).toBeGreaterThan(0);
  expect(outs.length).toBeGreaterThan(0);
  expect(ins.length).toBeGreaterThan(0);

  for (const [, , duration, delay, ...easings] of groups) {
    expect(duration).toBe(String(GEOMETRY_MS));
    expect(delay).toBe('0');
    expect(new Set(easings)).toEqual(new Set([GEOMETRY_CURVE]));
  }
  for (const [, , duration, delay, ...easings] of opacities.filter(
    (e) => e[1].includes('old') || e[3] === '0',
  )) {
    expect(duration).toBe(String(OUT_MS));
    expect(delay).toBe('0');
    expect(new Set(easings)).toEqual(new Set([OUT_CURVE]));
  }
  for (const [, , duration, delay, ...easings] of ins) {
    expect(duration).toBe(String(IN_MS));
    expect(delay).toBe(String(IN_DELAY_MS));
    expect(new Set(easings)).toEqual(new Set([IN_CURVE]));
  }
  /* Every one of them, blending included, is inside the 400ms the swap claims. */
  for (const entry of [...groups, ...outs, ...ins]) {
    const [, , duration, delay] = entry;
    expect(Number(delay) + Number(duration)).toBeLessThanOrEqual(GEOMETRY_MS + IN_DELAY_MS + IN_MS);
  }
  expect(blends.length).toBeGreaterThan(0);
}

/*
 * The two halves overlap, and by a little.
 *
 * This is the property that separates a dissolve from a flash. The old page is gone
 * at 180ms and the new one starts at 140ms, so there are 40ms where both are
 * partly on screen: long enough to read as one dissolve, short enough that the
 * reader never sees an empty page. A cross-fade with no delay — the previous
 * design — had zero overlap and no moment where either page was settled, which is
 * what "it does not feel like a transition" was.
 */
async function overlapsTheTwoHalvesInsteadOfGappingThem({ page }) {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto('/');
  await page.waitForTimeout(700);
  await parkTheScroll(page);
  await page.waitForTimeout(300);

  await installViewTransitionRecorder(page);
  await navigateTo(page, '/00-preface/');
  await page.waitForTimeout(1500);
  const animations = await readViewTransitionRecorder(page);

  /*
   * Measured, not asserted from the constants above.
   *
   * The first version of this computed the overlap from the test's own numbers,
   * which is a tautology: it would have passed with no stylesheet at all. The
   * interesting question is what the BROWSER ran, so the two endpoints come out of
   * the recorder.
   */
  const oldest = splitAnimations(animations, '::view-transition-old')
    .filter((entry) => !entry[1].includes('-ua-mix-blend-mode-'))
    .map((entry) => Number(entry[2]) + Number(entry[3]))
    .toSorted((a, b) => a - b);
  const earliestNew = splitAnimations(animations, '::view-transition-new')
    .filter((entry) => !entry[1].includes('-ua-mix-blend-mode-'))
    .map((entry) => Number(entry[3]))
    .toSorted((a, b) => a - b);

  expect(oldest.length).toBeGreaterThan(0);
  expect(earliestNew.length).toBeGreaterThan(0);

  /* The fade-out is over by the time the fade-in starts, or has not — a gap is a
     flash, and a cross-fade the reader never sees is the thing being replaced. */
  const overlap = Math.max(...oldest) - Math.min(...earliestNew);
  expect(overlap).toBeGreaterThan(0);
  /* Not so much that both pages are on screen together for most of the swap. */
  expect(overlap).toBeLessThanOrEqual(OUT_MS / 2);
}

/*
 * Reduced motion means less of it, not the same motion with a longer clock.
 *
 * The retiming rules target view-transition pseudo-elements, which `*` does not
 * reach, so without an explicit override a reader who has asked for reduced motion
 * gets 400ms — longer than the 180ms they had before the sequence was introduced.
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

  expect(animations.filter((entry) => entry.startsWith('::view-transition'))).toEqual([]);
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
  test(
    'runs every animation on one duration and one curve per axis',
    runsOneDurationAndOneCurvePerAxis,
  );
  test('overlaps the two halves instead of gapping them', overlapsTheTwoHalvesInsteadOfGappingThem);
  test(
    'gives a reduced-motion reader no transition at all',
    givesAReducedMotionReaderNoTransitionAtAll,
  );
  test(
    'plays the title-block entrance once per document, not once per arrival',
    playsTheEntranceOncePerDocument,
  );
});
