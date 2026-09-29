import { expect } from '@playwright/test';
import { DESKTOP_VIEWPORT } from './toc.mjs';

export const RAIL_GRID = '.toc-rail-grid';
export const RAIL = 'aside.toc-viewport';
/*
 * The rail's one control.
 *
 * Selected by its class, not by `[data-toc-rail-toggle]` inside the rail: the
 * button is `position: fixed`, so it is the element that has to be found, and
 * scoping it to the rail would be scoping it to the thing it now outlives. There
 * is one of these in a document and it is valid in both states, which is the whole
 * point of it having become one control.
 */
export const RAIL_TOGGLE = '.toc-rail-toggle';
export const COLUMN = '.reading-column';
export const ARTICLE = 'article.prose';
export const READING_PREFS = '#reading-prefs';
export const FLAGSHIP = '/00-preface/02-how-to-prove-a-win/';

const box = (element) => {
  if (!element) {
    return null;
  }
  const { left, width } = element.getBoundingClientRect();
  return { left: Math.round(left), width: Math.round(width) };
};

/** Everything the two rail states can be told apart by, in one read. */
export const railGeometry = (page) =>
  page.evaluate(
    ({ article, column, grid, rail, toggle }) => {
      const pick = (selector) => document.querySelector(selector);
      const gridStyle = getComputedStyle(pick(grid));
      const cellStyle = getComputedStyle(pick('.toc-rail-cell'));

      return {
        column: (() => {
          const rect = pick(column).getBoundingClientRect();
          return { left: Math.round(rect.left), width: Math.round(rect.width) };
        })(),
        article: (() => {
          const rect = pick(article).getBoundingClientRect();
          return { left: Math.round(rect.left), width: Math.round(rect.width) };
        })(),
        rail: (() => {
          const rect = pick(rail).getBoundingClientRect();
          return { left: Math.round(rect.left), width: Math.round(rect.width) };
        })(),
        track: gridStyle.gridTemplateColumns.split(' ')[0],
        gap: gridStyle.gap,
        cellVisibility: cellStyle.visibility,
        toggleVisibility: getComputedStyle(pick(toggle)).visibility,
        attribute: document.documentElement.dataset.readingToc,
        stored: localStorage.getItem('reading-toc'),
        expanded: [...document.querySelectorAll('[data-toc-rail-toggle]')].map((control) =>
          control.getAttribute('aria-expanded'),
        ),
      };
    },
    { article: ARTICLE, column: COLUMN, grid: RAIL_GRID, rail: RAIL, toggle: RAIL_TOGGLE },
  );

/** Close the rail and wait for the track to finish collapsing. */
export async function collapseRail(page) {
  await page.click(RAIL_TOGGLE);
  await expect.poll(async () => (await railGeometry(page)).track).toBe('0px');
}

export async function openPrefs(page) {
  await page.click(`${READING_PREFS} summary`);
  await expect(page.locator(`${READING_PREFS} [data-reading-pref="text"]`).first()).toBeVisible();
}

export const prefSteps = (page, kind) =>
  page.evaluate(
    (preference) =>
      [...document.querySelectorAll(`[data-reading-pref="${preference}"]`)].map((control) => ({
        value: control.dataset.value,
        name: control.getAttribute('aria-label'),
        pressed: control.getAttribute('aria-pressed'),
      })),
    kind,
  );

export const typeRamp = (page) =>
  page.evaluate(() => {
    const fontOf = (selector) => getComputedStyle(document.querySelector(selector)).fontSize;
    return {
      body: fontOf('body'),
      heading: fontOf('h1'),
      toc: fontOf('aside.toc-viewport a'),
    };
  });

export const shellLeft = (page) =>
  page.evaluate(() =>
    Math.round(document.querySelector('header > div').getBoundingClientRect().left),
  );

export const articleRight = (page) =>
  page.evaluate(
    (selector) => Math.round(document.querySelector(selector).getBoundingClientRect().right),
    ARTICLE,
  );

export const articleWidth = (page) =>
  page.evaluate(
    (selector) => Math.round(document.querySelector(selector).getBoundingClientRect().width),
    ARTICLE,
  );

export const rootFlag = (page, name) =>
  page.evaluate((flag) => document.documentElement.dataset[flag], name);

export const hasRootFlag = (page, name) =>
  page.evaluate((flag) => Object.hasOwn(document.documentElement.dataset, flag), name);

/**
 * Choose a step and wait for the control to report it.
 *
 * The wait is on `aria-pressed`, not on the `<html>` attribute, because choosing
 * the DEFAULT step removes the attribute — and a helper that waited for the flag
 * to equal the value would hang on exactly the case that matters most.
 */
export async function choosePref(page, kind, value) {
  const selector = `[data-reading-pref="${kind}"][data-value="${value}"]`;
  await page.click(selector);
  await expect(page.locator(selector)).toHaveAttribute('aria-pressed', 'true');
}

/** Half a pixel of slack for subpixel layout rounding. */
export const isCentred = (left, width, viewportWidth) =>
  Math.abs(left + width / 2 - viewportWidth / 2) <= 1;

export const noHorizontalOverflow = (page) =>
  expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(DESKTOP_VIEWPORT.width);

export { box };
