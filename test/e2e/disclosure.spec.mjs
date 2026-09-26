import { expect, test } from '@playwright/test';
import {
  findEscapingOverflow,
  injectProseDisclosure,
  measureDisclosure,
  px,
  waitForDisclosureClosed,
  waitForDisclosureOpen,
} from './support/disclosure.mjs';
import { waitForStable } from './support/settle.mjs';
import { ARTICLE } from './support/toc.mjs';

/** Open a disclosure and wait for its row to finish filling. */
async function openAndSettle(details) {
  await details.locator('summary').click();
  await expect(details).toHaveAttribute('open', '');
  await waitForDisclosureOpen(details);
}

/** The declared duration of the row transition, in milliseconds. */
const flowTransitionMs = (locator) =>
  locator
    .locator('.disclosure-flow')
    .evaluate((el) => Number.parseFloat(getComputedStyle(el).transitionDuration) * 1000);

const goto = (page) => page.goto(ARTICLE, { waitUntil: 'networkidle' });

test.describe('prose disclosure — open/close', () => {
  test.beforeEach(async ({ page }) => {
    await goto(page);
  });

  test('opens and closes smoothly, settling fully collapsed', async ({ page }) => {
    const details = await injectProseDisclosure(page);
    const summary = details.locator('summary');

    await openAndSettle(details);
    expect((await measureDisclosure(details)).flowHeight).toBeGreaterThan(20);

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
    await openAndSettle(details);

    await summary.click();
    await summary.click();
    await expect(details).toHaveAttribute('open', '');
    await expect
      .poll(async () => (await measureDisclosure(details)).flowHeight, { timeout: 3000 })
      .toBeGreaterThan(20);

    const state = await measureDisclosure(details);
    expect(state.open).toBe(true);
    expect(state.closing).toBe(false);
  });
});

/*
 * The motion and padding half of the disclosure surface.
 *
 * "Not a jump" is asserted deterministically: the collapse DECLARES a non-zero
 * transition, and the row settles to zero afterwards. A jump-to-closed
 * implementation reports `transition-duration: 0s`, so this still fails if the
 * animation is removed — without depending on how many animation frames the
 * machine managed to deliver.
 *
 * The previous version asserted on a `requestAnimationFrame` sample series.
 * Across three engines and three runs that produced `[135]`, `[135, 135]` and a
 * `transitionend` landing mid-flight at ~135px: the `transitioncancel` the
 * controller triggers when it drops `data-disclosure-closing` races the
 * `transitionend` that is supposed to end the sampling window. Every failure was
 * a statement about the sampler, not about the CSS. The sampler is preserved as
 * `test/probe/probe-collapse-samples.mjs`, where it reports a monotonic curve
 * from 135.5px through 16 intermediate heights down to 0.
 *
 * The collapsed row is accepted in either of its two computed spellings.
 * Measured against the built site:
 *
 *   chromium  0px      (used value)
 *   webkit    0px      (used value)
 *   firefox   0fr      (declared value)
 *
 * Engines disagree on whether `getComputedStyle` resolves `grid-template-rows` to
 * the used or the declared length, so asserting `0px` asserted an engine's
 * serialisation choice and failed on firefox. Both spellings mean a zero-height
 * row, and the measured height is the real guarantee; what this guards is that the
 * collapse uses the `0fr` technique rather than a hard `0`, which would not animate
 * at all.
 */
test.describe('prose disclosure — motion + padding', () => {
  test.beforeEach(async ({ page }) => {
    await goto(page);
  });

  test('collapses through intermediate heights (smooth, not a jump)', async ({ page }) => {
    const details = await injectProseDisclosure(page);
    await openAndSettle(details);
    expect(await flowTransitionMs(details), 'a jump would declare 0s').toBe(280);
    expect((await measureDisclosure(details)).flowHeight).toBeGreaterThan(20);

    await details.locator('summary').click();
    await waitForDisclosureClosed(details);
    const closed = await measureDisclosure(details);
    expect(closed.flowHeight).toBeLessThan(1);
    expect(['0fr', '0px']).toContain(closed.rows);
  });

  test('open and close release the inner padding, ending at zero', async ({ page }) => {
    const details = await injectProseDisclosure(page);
    const summary = details.locator('summary');

    await openAndSettle(details);
    expect((await measureDisclosure(details)).padding).not.toBe('0px');

    await summary.click();
    await waitForDisclosureClosed(details);
    expect((await measureDisclosure(details)).padding).toBe('0px');
  });
});

/*
 * With scripting off there is no controller, so `<details>` must do the work on
 * its own. This is the guarantee for anyone whose JavaScript never runs, and it
 * is not covered by any test above — all of those drive a scripted collapse.
 */
test.describe('prose disclosure (no JS)', () => {
  test.use({ javaScriptEnabled: false });

  test('opens and closes natively, with content reachable', async ({ page }) => {
    // The evidence key is the only DISCLOSURE-CLASSED element that ships, and it
    // ships on the home page — the article route has no `.disclosure` of its own.
    await page.goto('/', { waitUntil: 'networkidle' });
    const shipped = page.locator('#evidence-key');
    await expect(shipped).toBeVisible();

    const closedHeight = px(
      await shipped.locator('.disclosure-flow').evaluate((el) => el.getBoundingClientRect().height),
    );
    expect(closedHeight).toBe(0);

    await (await waitForStable(shipped.locator('summary'))).click();
    await expect(shipped).toHaveAttribute('open', '');

    // The content must be REACHABLE, not merely present: a collapsed row that
    // still traps focus is worse than one that simply does not open.
    const openHeight = px(
      await shipped.locator('.disclosure-flow').evaluate((el) => el.getBoundingClientRect().height),
    );
    expect(openHeight).toBeGreaterThan(20);
    expect((await findEscapingOverflow(page)).escapes).toEqual([]);
  });
});
