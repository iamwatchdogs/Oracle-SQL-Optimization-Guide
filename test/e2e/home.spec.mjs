import { test, expect } from '@playwright/test';
import {
  EVIDENCE_KEY,
  THEME_TOGGLE,
  measureDisclosure,
  hasHorizontalOverflow,
} from './support/disclosure.mjs';

test.describe('home evidence key', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('rests fully collapsed with no residual padding band', async ({ page }) => {
    const key = page.locator(EVIDENCE_KEY);
    await expect(key).toHaveCount(1);
    const closed = await measureDisclosure(key);
    expect(closed.open).toBe(false);
    expect(closed.flowHeight).toBeLessThan(1);
    expect(closed.padding).toBe('0px');
  });

  test('opens and closes cleanly', async ({ page }) => {
    const key = page.locator(EVIDENCE_KEY);
    const summary = key.locator('summary');
    await summary.click();
    await expect(key).toHaveAttribute('open', '');
    await page.waitForTimeout(400);
    expect((await measureDisclosure(key)).flowHeight).toBeGreaterThan(20);

    await summary.click();
    await expect(key).not.toHaveAttribute('open', '');
    await page.waitForTimeout(600);
    const closed = await measureDisclosure(key);
    expect(closed.flowHeight).toBeLessThan(1);
    expect(closed.padding).toBe('0px');
  });
});

test.describe('theme toggle', () => {
  test('toggles theme, updates label, and persists across reload', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator(THEME_TOGGLE);
    await expect(toggle).toHaveAttribute('aria-label', /switch to/iu);
    const before = await page.evaluate(() => document.documentElement.dataset.theme);

    await toggle.click();
    const after = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(after).not.toBe(before);
    await expect(toggle).toHaveAttribute('aria-label', /switch to/iu);

    await page.reload();
    await page.waitForLoadState('networkidle');
    const persisted = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(persisted).toBe(after);
  });

  test('meets a 44px touch target', async ({ page }) => {
    await page.goto('/');
    const box = await page.locator(THEME_TOGGLE).boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  });
});

test.describe('layout sanity', () => {
  for (const route of [
    '/',
    '/08-bonus-batch-api/',
    '/02-papers-behind-recipes/02-oracles-own-papers/',
  ]) {
    test(`no horizontal overflow or console errors on ${route}`, async ({ page }) => {
      const errors = [];
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      expect(await hasHorizontalOverflow(page)).toBe(false);
      expect(errors).toEqual([]);
    });
  }
});
