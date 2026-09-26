import { expect } from '@playwright/test';

/**
 * Wait for a target's box to stop moving, then interact with it normally.
 *
 * The home title block animates in, so for the first few frames the evidence
 * key's summary is still translating. Playwright's actionability check reports
 * that as "element is not stable" and eventually times out — on `click()`, on
 * `focus()`, on anything.
 *
 * Forcing the interaction would silence that, but it would also silence a genuine
 * "this never settles" regression, which is a real thing to catch on a page with
 * entrance animation. So the stability is waited for and the interaction stays a
 * normal one.
 *
 * A fake that skipped this by calling with `force: true` would make the animation
 * look like it was not there.
 */
export async function waitForStable(locator, { timeout = 10_000 } = {}) {
  let previous = Number.NaN;
  await expect
    .poll(
      async () => {
        const top = await locator.evaluate((el) => Math.round(el.getBoundingClientRect().top));
        const settled = top === previous;
        previous = top;
        return settled;
      },
      { message: 'the target never stopped moving', timeout },
    )
    .toBe(true);
  return locator;
}
