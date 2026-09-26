import { expect, test } from '@playwright/test';
import { EVIDENCE_KEY, ms } from './support/disclosure.mjs';

/**
 * Disclosure motion.
 *
 * Split from `disclosure-ui.spec.mjs` for file length only; the contract is the
 * same one the stylesheet encodes. There is exactly one number: 280ms. The
 * `grid-template-rows` collapse, the chevron rotation and the running inner
 * padding must all ride that curve, and the reduced-motion override must
 * neutralise every one of them.
 */
test.describe('disclosure motion', () => {
  test('honours prefers-reduced-motion on the open and close', honoursReducedMotion);

  test('uses one shared 280ms curve for the flow and the chevron', sharesOneCurve);
});

async function honoursReducedMotion({ page }) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const durations = await page
    .locator(`${EVIDENCE_KEY} .disclosure-flow`)
    .evaluate((el) => getComputedStyle(el).transitionDuration);
  for (const duration of durations.split(',')) {
    expect(ms(duration)).toBe(0);
  }
}

async function sharesOneCurve({ page }) {
  await page.goto('/00-preface/');
  const flow = await page
    .locator('[data-toc-mobile] .disclosure-flow')
    .evaluate((el) => getComputedStyle(el).transitionDuration);
  const icon = await page
    .locator('[data-toc-mobile] .disclosure-icon')
    .evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(flow).toBe(icon);
  // `transitionDuration` is reported in seconds (`"0.28s"`), so this has to go
  // through `ms()` — `px("0.28s")` is `0.28`, not `280`.
  expect(ms(flow)).toBe(280);
}
