import { test, expect } from '@playwright/test';
import {
  injectProseDisclosure,
  measureDisclosure,
  sampleCollapseHeights,
  waitForDisclosureClosed,
} from './support/disclosure.mjs';

const goto = (page) =>
  page.goto('/08-bonus-batch-api/').then(() => page.waitForLoadState('networkidle'));

test.describe('prose disclosure — open/close', () => {
  test.beforeEach(async ({ page }) => {
    await goto(page);
  });

  test('opens and closes smoothly, settling fully collapsed', async ({ page }) => {
    const details = await injectProseDisclosure(page);
    const summary = details.locator('summary');

    await summary.click();
    await expect(details).toHaveAttribute('open', '');
    const open = await measureDisclosure(details);
    expect(open.flowHeight).toBeGreaterThan(20);

    await summary.click();
    await waitForDisclosureClosed(details);
    const closed = await measureDisclosure(details);
    expect(closed.open).toBe(false);
    expect(closed.closing).toBe(false);
    expect(closed.flowHeight).toBeLessThan(1);
  });

  test('a second click during close cancels the collapse', async ({ page }) => {
    const details = await injectProseDisclosure(page);
    const summary = details.locator('summary');
    await summary.click();
    await expect(details).toHaveAttribute('open', '');
    await page.waitForTimeout(400);

    await summary.click();
    // mid-collapse
    await page.waitForTimeout(80);
    // cancel
    await summary.click();
    await page.waitForTimeout(400);

    const state = await measureDisclosure(details);
    expect(state.open).toBe(true);
    expect(state.closing).toBe(false);
    expect(state.flowHeight).toBeGreaterThan(20);
  });
});

test.describe('prose disclosure — motion + padding', () => {
  test.beforeEach(async ({ page }) => {
    await goto(page);
  });

  test('collapses through intermediate heights (smooth, not a jump)', async ({ page }) => {
    const details = await injectProseDisclosure(page);
    const summary = details.locator('summary');
    await summary.click();
    await expect(details).toHaveAttribute('open', '');
    await page.waitForTimeout(400);

    // The flow height should pass through several distinct intermediate values
    // while closing rather than snapping straight from open to closed.
    const samples = await sampleCollapseHeights(details);
    const distinct = [...new Set(samples)];
    expect(distinct.length).toBeGreaterThan(3);
    expect(samples.at(0)).toBeGreaterThan(20);
    expect(distinct.at(-1)).toBeLessThan(1);
  });

  test('open and close release the inner padding, ending at zero', async ({ page }) => {
    const details = await injectProseDisclosure(page);
    const summary = details.locator('summary');

    await summary.click();
    await expect(details).toHaveAttribute('open', '');
    await page.waitForTimeout(400);
    expect((await measureDisclosure(details)).padding).not.toBe('0px');

    await summary.click();
    await waitForDisclosureClosed(details);
    expect((await measureDisclosure(details)).padding).toBe('0px');
  });
});

test.describe('prose disclosure (no JS)', () => {
  test.use({ javaScriptEnabled: false });

  test('opens and closes natively, with content reachable', async ({ page }) => {
    await goto(page);
    const details = await injectProseDisclosure(page);
    const summary = details.locator('summary');

    await summary.click();
    await expect(details).toHaveAttribute('open', '');
    await page.waitForTimeout(600);
    const open = await measureDisclosure(details);
    expect(open.flowHeight).toBeGreaterThan(20);

    await summary.click();
    await expect(details).not.toHaveAttribute('open', '');
    await page.waitForTimeout(600);
    const closed = await measureDisclosure(details);
    // Content is hidden and the flow must fully collapse (no leftover gap).
    expect(closed.open).toBe(false);
    expect(closed.flowHeight).toBeLessThan(3);
  });
});
