import { expect } from '@playwright/test';

/**
 * Click an in-article link and wait for the navigation to land.
 *
 * Each href must be a link *inside `main#main`*: the site-nav panel carries
 * section links, and a hop through one of those clicks a control that only exists
 * once the panel is open. Hence sequential calls rather than a loop — the wait for
 * the new pathname is what makes the next click meaningful.
 *
 * Shared between `route-focus.spec.mjs` and `route-announcer.spec.mjs`, which were
 * one file until the announcer assertions needed their own and the combined file
 * ran past the size budget.
 */
export async function navigateTo(page, href) {
  const link = page.locator(`main#main a[href="${href}"]`).first();
  await expect(link, `no in-article link to ${href}`).toHaveCount(1);
  await link.click();
  await page.waitForFunction((target) => location.pathname === target, href, {
    timeout: 15_000,
  });
}
