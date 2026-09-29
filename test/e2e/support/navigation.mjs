import { expect } from '@playwright/test';
import { deployed } from './deployed.mjs';

/**
 * Click an in-article link and wait for the navigation to land.
 *
 * Each href must be a link *inside `main#main`*: the site-nav panel carries
 * section links, and a hop through one of those clicks a control that only exists
 * once the panel is open. Hence sequential calls rather than a loop — the wait for
 * the new pathname is what makes the next click meaningful.
 *
 * The caller writes the route the way the book does; `deployed` converts it on
 * both sides of the hop. A `waitForFunction` predicate runs in the browser and
 * cannot close over this module, so the converted path has to arrive as the
 * argument rather than be computed inside.
 *
 * Shared between `route-focus.spec.mjs` and `route-announcer.spec.mjs`, which were
 * one file until the announcer assertions needed their own and the combined file
 * ran past the size budget.
 */
export async function navigateTo(page, href) {
  const served = deployed(href);
  const link = page.locator(`main#main a[href="${served}"]`).first();
  await expect(link, `no in-article link to ${served}`).toHaveCount(1);
  await link.click();
  await page.waitForFunction((target) => location.pathname === target, served, {
    timeout: 15_000,
  });
}
