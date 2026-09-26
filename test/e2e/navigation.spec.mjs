import { test, expect } from '@playwright/test';
import { SITE_NAV_SUMMARY } from './support/disclosure.mjs';

test.describe('mobile navigation disclosure', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('opens as a viewport-anchored overlay and closes', async ({ page }) => {
    await page.goto('/02-papers-behind-recipes/02-oracles-own-papers/');
    await page.waitForLoadState('networkidle');

    const summary = page.locator(SITE_NAV_SUMMARY).first();
    const panel = summary.locator('xpath=following-sibling::*[1]');

    await summary.click({ force: true });
    await page.waitForTimeout(400);

    // The panel must be anchored to the viewport (not offset by a transform),
    // sitting inside the viewport horizontally.
    const rect = await panel.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, width: r.width, height: r.height };
    });
    expect(rect.left).toBeGreaterThanOrEqual(0);
    expect(rect.right).toBeLessThanOrEqual(390);
    expect(rect.width).toBeGreaterThan(200);
    expect(rect.height).toBeGreaterThan(50);

    const transform = await panel.evaluate((el) => getComputedStyle(el).transform);
    expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(transform);

    await summary.click({ force: true });
    await page.waitForTimeout(600);
  });
});

test.describe('table of contents', () => {
  test('marks exactly one current section and exposes labels', async ({ page }) => {
    await page.goto('/02-papers-behind-recipes/02-oracles-own-papers/');
    await page.waitForLoadState('networkidle');

    const current = page.locator('[data-toc-link][aria-current="location"]');
    // Two TOC lists exist (desktop aside + mobile nav); each has one current.
    await expect(current).toHaveCount(2);
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('disclosure still opens/closes instantly with no animation', async ({ page }) => {
    await page.goto('/');
    const key = page.locator('#evidence-key');
    const summary = key.locator('summary');
    await summary.click();
    await expect(key).toHaveAttribute('open', '');
    const flow = key.locator('.disclosure-flow');
    const duration = await flow.evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(['0s', '0ms']).toContain(duration);
  });
});
