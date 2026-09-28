/*
 * The skeleton and the rail.
 *
 * The one case where the reading surface's geometry is not a property of the page
 * but of the reader: closing the TOC moves the whole column 120px left, and the
 * skeleton has to move with it or it stands beside a page it is not replacing.
 *
 * It is its own file because that is a different question from "does the skeleton
 * map this page type", which `skeleton-mapping.spec.mjs` answers for all three.
 */

import { expect, test } from '@playwright/test';
import { collapseRail } from './support/reading-prefs.mjs';
import { DESKTOP_VIEWPORT } from './support/toc.mjs';

const parkTheScroll = (page) =>
  page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
  });

const headerBox = (page, selector) =>
  page.evaluate((sel) => {
    const { left, top, width } = document.querySelector(sel).getBoundingClientRect();
    return {
      left: Math.round(left * 10) / 10,
      top: Math.round(top * 10) / 10,
      width: Math.round(width * 10) / 10,
    };
  }, selector);

test('the skeleton follows the rail: a shut rail moves the text it stands in for', async ({
  page,
}) => {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  /* From a page that HAS a rail: the home page has no rail and no toggle. */
  await page.goto('/01-proven-techniques/01-measure-first/');
  await page.waitForTimeout(400);
  await parkTheScroll(page);

  /*
   * Close the rail through its own control, not by writing `localStorage` behind
   * the controller's back. The controller holds the preference in memory and
   * re-projects that memory on every swap, so a raw `setItem` leaves the reader
   * with a collapsed rail that springs open again on the next navigation — which
   * is a real defect, and not the one this test is about.
   *
   * Collapsing first is the point: the destination page then renders with a shut
   * rail, and the skeleton has to be built for that geometry. The private grid
   * this replaced ignored `data-reading-toc` entirely and sat 120px right of the
   * text it was standing in for.
   */
  await collapseRail(page);

  const to = '/03-toolbox/01-measure-with-xplan-and-monitor/';
  await page.route(`**${to}`, async (route) => {
    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
    await route.continue();
  });
  await page.evaluate((href) => {
    [...document.querySelectorAll('a')].find((a) => a.getAttribute('href') === href).click();
  }, to);

  await expect(page.locator('#route-loader')).toHaveAttribute('data-visible', 'true');
  const skeleton = await headerBox(page, '#route-loader [data-skeleton-row="header"]');
  expect(await page.locator('#route-loader').getAttribute('data-skeleton')).toBe('notebook');

  await page.waitForURL(`**${to}`);
  await page.waitForTimeout(500);

  /* The real column moves 120px left when the rail shuts. The skeleton shares the
     page's `toc-rail-grid`, so it moves with it instead of standing still. */
  const real = await headerBox(page, 'article.prose header');
  expect(real.left).toBeLessThan(400);
  expect(Math.abs(skeleton.left - real.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(skeleton.top - real.top)).toBeLessThanOrEqual(4);
  expect(Math.abs(skeleton.width - real.width)).toBeLessThanOrEqual(4);
});
