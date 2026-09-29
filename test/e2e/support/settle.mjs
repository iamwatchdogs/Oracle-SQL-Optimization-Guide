import { expect } from '@playwright/test';

/**
 * Wait for a target to be genuinely at rest, then interact with it normally.
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
 *
 * ## Two conditions, not one
 *
 * "The box stopped moving" is not the same as "the animation finished", and only
 * the second one is safe to interact with. `cubic-bezier(0.22, 1, 0.36, 1)` spends
 * its last frames moving less than a pixel, so a rounded-position poll returns the
 * same `top` twice while the animation still has 200ms to run — and Playwright's
 * own check, which samples the unrounded box across animation frames, then rejects
 * the click. The margin between those two moments is small enough that a change
 * anywhere above it (one more line of prose, one more row in a list) is enough to
 * flip the test from reliably green to reliably red.
 *
 * So this waits for BOTH: a settled box and no running animation on the target or
 * its subtree. That is the real precondition for a click, and it removes the
 * dependence on how tall the page happens to be above the target.
 */
export async function waitForStable(locator, { timeout = 10_000 } = {}) {
  let previous = Number.NaN;
  await expect
    .poll(
      async () => {
        const state = await locator.evaluate((element) => ({
          top: Math.round(element.getBoundingClientRect().top),
          /* `running` covers both CSS animations and transitions. The route
           * loader's `animate-pulse` is `paused` at rest by design, so it does
           * not hold this open — see the note in `src/styles/global.css`. */
          animating: element
            .getAnimations({ subtree: true })
            .some((animation) => animation.playState === 'running'),
        }));
        const settled = state.top === previous && !state.animating;
        previous = state.top;
        return settled;
      },
      { message: 'the target never stopped moving', timeout },
    )
    .toBe(true);
  return locator;
}
