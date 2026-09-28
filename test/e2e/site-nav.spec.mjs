import { expect, test } from '@playwright/test';
import { ms, SITE_NAV, SITE_NAV_SUMMARY } from './support/disclosure.mjs';
import { waitForDisclosureOpen } from './support/disclosure-settle.mjs';
import { DESKTOP, MOBILE } from './support/viewports.mjs';

/**
 * Site navigation disclosure.
 *
 * This surface absorbed several real defects, all of which the existing
 * `navigation.spec.mjs` could not see.
 *
 * 1. `position: fixed` cannot overlay the viewport from inside a `<details>`.
 *    Chrome wraps the non-summary children in `::details-content`, whose
 *    `content-visibility` implies `contain: layout paint size`, so the element
 *    establishes a containing block no matter what `position` says. The overlay
 *    measured 71.78px wide at x=234 and ran 358px off a 390px screen. Below
 *    `48rem` the panel is therefore IN FLOW, full width, under the controls.
 *
 * 2. `basis-full` applied unconditionally wrapped the summary onto its own flex
 *    row while the menu was shut, doubling a sticky header that is on screen at
 *    all times — 96px on a phone. It is gated on `open`.
 *
 * 3. With the panel in flow the open header would own most of the viewport, so
 *    below `48rem` the header returns to normal flow.
 *
 * 4. The close was asserted by nothing: a second click and a `waitForTimeout`
 *    stood in for it, so the test passed whether or not the panel ever
 *    collapsed.
 *
 * Promotion map for the probes that found all of this: `test/probe/README.md`.
 */

const ROUTE = '/02-papers-behind-recipes/02-oracles-own-papers/';

const PANEL = `${SITE_NAV} > div`;

const panelBox = (page) =>
  page.locator(PANEL).evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      width: rect.width,
      height: rect.height,
      position: getComputedStyle(el).position,
    };
  });

const headerHeight = (page) =>
  page
    .locator('header')
    .first()
    .evaluate((el) => el.getBoundingClientRect().height);

test.describe('site nav — mobile, menu closed', () => {
  test.use({ viewport: MOBILE });

  test('keeps the header one row tall', async ({ page }) => {
    await page.goto('/');
    const height = await headerHeight(page);
    // `basis-full` applied unconditionally wrapped the summary onto its own row
    // even while the menu was shut, doubling a sticky header.
    expect(height).toBeLessThanOrEqual(64);
  });

  test('leaves the panel collapsed and unpositioned', async ({ page }) => {
    await page.goto('/');
    /*
     * Asserted against the guarantee, not against `<details>` internals.
     *
     * The earlier version asserted `width === 0`. Measured against the built
     * site, a closed panel reports a ~104px-wide, ZERO-HEIGHT box in all three
     * engines (chromium included) — the width is how the engine lays out a
     * collapsed child, not how much space the menu takes. It failed on firefox
     * and webkit and passed on chromium for reasons that have nothing to do with
     * the product.
     *
     * What actually matters when the menu is shut: it occupies no vertical space
     * (so the sticky header stays one row), it is not positioned out of flow, and
     * its links cannot take focus. Those are the properties a reader or a
     * keyboard user can observe, and they hold identically in all three engines.
     */
    const box = await panelBox(page);
    expect(box.height).toBe(0);
    expect(box.position).toBe('static');

    const reachable = await page
      .locator(`${PANEL} a`)
      .first()
      .evaluate((el) => {
        el.focus();
        return document.activeElement === el;
      });
    expect(reachable, 'a link inside a closed panel took focus').toBe(false);
  });
});

test.describe('site nav — mobile, menu open', () => {
  test.use({ viewport: MOBILE });

  test('is a full-width in-flow panel with a viewport gutter', async ({ page }) => {
    await page.goto('/');
    await page.locator(SITE_NAV_SUMMARY).click();
    await expect(page.locator(SITE_NAV)).toHaveAttribute('open', '');

    const box = await panelBox(page);
    // `static`, not `fixed` or `absolute`: nothing positioned from inside a
    // `<details>` can be overlaid on the viewport.
    expect(box.position).toBe('static');
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(390);
    expect(box.width).toBeGreaterThan(300);
  });

  test('closes on a second activation and the panel collapses', async ({ page }) => {
    await page.goto('/');
    const details = page.locator(SITE_NAV);
    await page.locator(SITE_NAV_SUMMARY).click();
    await expect(details).toHaveAttribute('open', '');
    /*
     * Waited, not sampled. The row is `grid-template-rows: 0fr → 1fr` over 280ms
     * with a 40ms delay in each direction, so the panel is legitimately still 0px
     * on the frames right after the `open` attribute lands. A single read there
     * passes or fails on where the sample falls, and the close below already
     * polls for exactly this reason.
     */
    await waitForDisclosureOpen(details);
    expect((await panelBox(page)).height).toBeGreaterThan(0);

    await page.locator(SITE_NAV_SUMMARY).click();
    await expect(details).not.toHaveAttribute('open', /.*/u);
    // The close itself, asserted for the first time: the row settles to zero.
    await expect.poll(async () => (await panelBox(page)).height, { timeout: 3000 }).toBeLessThan(1);
  });

  test('closes from the keyboard', async ({ page }) => {
    await page.goto('/');
    const details = page.locator(SITE_NAV);
    await page.locator(SITE_NAV_SUMMARY).focus();
    await page.keyboard.press('Enter');
    await expect(details).toHaveAttribute('open', '');
    await page.keyboard.press('Enter');
    await expect(details).not.toHaveAttribute('open', /.*/u);
  });
});

test.describe('site nav — mobile, panel capacity', () => {
  test.use({ viewport: MOBILE });

  test('caps the panel height so the menu does not own the screen', async ({ page }) => {
    await page.goto('/');
    await page.locator(SITE_NAV_SUMMARY).click();
    const box = await panelBox(page);
    const viewport = page.viewportSize();
    expect(box.height).toBeLessThanOrEqual(viewport.height * 0.7 + 1);
  });

  test('scrolls the section list internally', async ({ page }) => {
    await page.goto('/');
    await page.locator(SITE_NAV_SUMMARY).click();
    const nav = page.locator('header nav[aria-label="Book sections"]');
    const metrics = await nav.evaluate((el) => ({
      overflowY: getComputedStyle(el).overflowY,
      overscroll: getComputedStyle(el).overscrollBehaviorY,
      // `getComputedStyle` resolves lengths, so the declared `100dvh - 6rem`
      // arrives in pixels. Assert the resolved value against the design
      // system's 6rem chrome reservation rather than looking for the unit.
      maxHeightPx: Number.parseFloat(getComputedStyle(el).maxHeight),
      viewportHeight: window.innerHeight,
    }));
    expect(metrics.overflowY).toBe('auto');
    expect(metrics.overscroll).toContain('contain');
    expect(metrics.maxHeightPx).toBeCloseTo(metrics.viewportHeight - 96, 0);
  });
});

test.describe('site nav — desktop dropdown', () => {
  test.use({ viewport: DESKTOP });

  test('stays a right-anchored dropdown capped at 22rem', async ({ page }) => {
    await page.goto(ROUTE);
    await page.locator(SITE_NAV_SUMMARY).click();
    const box = await panelBox(page);
    expect(box.position).toBe('absolute');
    expect(box.width).toBeLessThanOrEqual(352);
  });

  test('keeps the header one row tall when open', async ({ page }) => {
    await page.goto(ROUTE);
    await page.locator(SITE_NAV_SUMMARY).click();
    expect(await headerHeight(page)).toBeLessThanOrEqual(64);
  });

  test('carries no transform on the panel or its containing block', async ({ page }) => {
    await page.goto(ROUTE);
    await page.locator(SITE_NAV_SUMMARY).click();
    // A transform on any ancestor would re-establish a containing block and
    // silently re-break the geometry above.
    const transforms = await page.locator(PANEL).evaluate((panel) => {
      const found = [];
      for (let el = panel; el && el !== document.body; el = el.parentElement) {
        const value = getComputedStyle(el).transform;
        if (value && value !== 'none') {
          found.push(`${el.tagName.toLowerCase()}: ${value}`);
        }
      }
      return found;
    });
    expect(transforms).toEqual([]);
  });

  test('marks exactly one section current and names the panel as a nav landmark', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await page.locator(SITE_NAV_SUMMARY).click();
    await expect(page.locator('header nav[aria-label="Book sections"]')).toHaveCount(1);
    await expect(page.locator('header nav a[aria-current="location"]')).toHaveCount(1);
  });
});

test.describe('site nav — disclosure motion', () => {
  test.use({ viewport: MOBILE });

  test('runs the collapse on the 280ms curve', async ({ page }) => {
    await page.goto('/');
    await page.locator(SITE_NAV_SUMMARY).click();
    const duration = await page
      .locator(`${SITE_NAV} .disclosure-flow`)
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(ms(duration)).toBe(280);
  });

  test('honours prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const duration = await page
      .locator(`${SITE_NAV} .disclosure-flow`)
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(ms(duration)).toBe(0);
  });
});
