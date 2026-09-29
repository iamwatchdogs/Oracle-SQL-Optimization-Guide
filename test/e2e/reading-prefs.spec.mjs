/*
 * The reading preferences: text scale and line measure.
 *
 * Both are one attribute on `<html>` and nothing else — the ramp and the measure
 * live in `global.css`, so these controls are a projection of the stylesheet
 * rather than a second copy of it. The tests below are about that relationship:
 * that every step names its action, that choosing a step moves the DOM the way
 * the stylesheet says it will, and that choosing the default leaves no override
 * behind at all.
 */

import { expect, test } from '@playwright/test';
import { DESKTOP_VIEWPORT, PHONE_VIEWPORT } from './support/toc.mjs';
import {
  articleWidth,
  choosePref,
  collapseRail,
  FLAGSHIP,
  hasRootFlag,
  isCentred,
  openPrefs,
  prefSteps,
  railGeometry,
  rootFlag,
  typeRamp,
} from './support/reading-prefs.mjs';

const openOnDesktop = async (page) => {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto(FLAGSHIP);
};

async function everyStepNamesItsAction({ page }) {
  await openOnDesktop(page);
  await openPrefs(page);

  const text = await prefSteps(page, 'text');
  const measure = await prefSteps(page, 'measure');

  expect(text.map((step) => step.value)).toEqual(['0.9', '1', '1.1', '1.2']);
  expect(measure.map((step) => step.value)).toEqual(['60', '70', '75']);
  expect(text.filter((step) => step.pressed === 'true')).toHaveLength(1);
  expect(measure.filter((step) => step.pressed === 'true')).toHaveLength(1);
  for (const control of [...text, ...measure]) {
    expect(control.name).toMatch(/^Set /u);
    expect(control.name).toMatch(/%$|characters$/u);
  }
}

async function scalesTheWholeTypeRamp({ page }) {
  await openOnDesktop(page);
  const base = await typeRamp(page);

  await openPrefs(page);
  await choosePref(page, 'text', '1.2');
  const large = await typeRamp(page);

  /* A control that moved only the body would leave the heading scale, the TOC
     labels and the mono metadata behind — the page would come apart into two type
     systems the moment a reader touched it. */
  for (const key of ['body', 'heading', 'toc']) {
    expect(Number.parseFloat(large[key])).toBeGreaterThan(Number.parseFloat(base[key]));
  }
}

async function movesTheMeasureInCharactersAndPixels({ page }) {
  await openOnDesktop(page);
  await openPrefs(page);
  const wide = await articleWidth(page);

  await choosePref(page, 'measure', '60');
  const narrow = await articleWidth(page);

  /* `ch` resolves against the element's OWN font, so a smaller measure in
     characters is a narrower column in pixels — the character count is what the
     reader is choosing, and it is what the control reports. Six characters of 18px
     Source Serif is ~57px; asserted loosely because the exact glyph width is a
     `ch` implementation detail, not the contract. */
  expect(narrow).toBeLessThan(wide);
  expect(Math.abs(narrow - wide)).toBeGreaterThan(40);
}

async function returnsToTheDefaultOnTheDefaultStep({ page }) {
  await openOnDesktop(page);
  await openPrefs(page);
  await choosePref(page, 'text', '0.9');
  expect(await hasRootFlag(page, 'readingText')).toBe(true);

  await choosePref(page, 'text', '1');
  /* The default is the ABSENCE of the attribute, so a reader who has chosen the
     default step has no override on `<html>` at all. */
  await expect.poll(() => hasRootFlag(page, 'readingText')).toBe(false);
}

async function recentresTheTextAtANonDefaultMeasure({ page }) {
  await openOnDesktop(page);
  await openPrefs(page);
  await choosePref(page, 'measure', '60');
  await collapseRail(page);

  const closed = await railGeometry(page);
  expect(isCentred(closed.article.left, closed.article.width, DESKTOP_VIEWPORT.width)).toBe(true);
}

async function restoresEveryPreferenceAfterAReload({ page }) {
  await openOnDesktop(page);
  await openPrefs(page);
  await choosePref(page, 'text', '1.1');
  await choosePref(page, 'measure', '75');
  const before = await typeRamp(page);

  await page.reload();
  expect(await rootFlag(page, 'readingText')).toBe('1.1');
  expect(await rootFlag(page, 'readingMeasure')).toBe('75');
  const after = await typeRamp(page);
  for (const key of ['body', 'heading', 'toc']) {
    expect(after[key]).toBe(before[key]);
  }
}

async function keepsOneHeaderDisclosureOpen({ page }) {
  await page.setViewportSize(PHONE_VIEWPORT);
  await page.goto(FLAGSHIP);
  await page.click('#site-nav > summary');
  await expect(page.locator('#site-nav')).toHaveAttribute('open', '');

  await page.click('#reading-prefs > summary');
  /* Two in-flow panels on a phone is a header that owns most of the screen. */
  await expect(page.locator('#site-nav')).not.toHaveAttribute('open', '');
  await expect(page.locator('#reading-prefs')).toHaveAttribute('open', '');
}

test.describe('the reading preferences', () => {
  test('every step names its action and exactly one is pressed', everyStepNamesItsAction);
  test('scales the whole type ramp, not the body alone', scalesTheWholeTypeRamp);
  test(
    'moves the measure in characters and in pixels together',
    movesTheMeasureInCharactersAndPixels,
  );
  test(
    'returns to the default when the default step is chosen again',
    returnsToTheDefaultOnTheDefaultStep,
  );
  test(
    're-centres the text when the rail is shut at a non-default measure',
    recentresTheTextAtANonDefaultMeasure,
  );
  test('restores every preference after a reload', restoresEveryPreferenceAfterAReload);
  test('keeps one header disclosure open at a time', keepsOneHeaderDisclosureOpen);
});
