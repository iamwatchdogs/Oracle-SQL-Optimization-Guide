/**
 * Waits for a disclosure row to reach a known state.
 *
 * Split out of `disclosure.mjs` because these are timing contracts rather than
 * measurements, and the measurement module was already at the file-length limit.
 */
import { expect } from '@playwright/test';
import { measureDisclosure } from './disclosure.mjs';

export async function waitForDisclosureOpen(locator, timeout = 3000) {
  await expect
    .poll(
      async () => {
        const state = await measureDisclosure(locator);
        return state.open === true && state.flowHeight !== null && state.flowHeight > 1;
      },
      { timeout, message: 'disclosure did not settle open' },
    )
    .toBe(true);
}

/**
 * Wait until a disclosure's row has finished filling.
 *
 * `waitForDisclosureOpen` is satisfied as soon as the row is visibly growing, so
 * it is the right wait for "the content is reachable" and the wrong one for
 * anything measured after the row finishes: the panel is still moving. This waits
 * on the same criterion the re-anchor uses, so a test that measures a settled
 * position is reading the position the re-anchor aimed at.
 *
 * ## Why this does not compare the row against its own `scrollHeight`
 *
 * The obvious gate — `flowHeight >= flow.scrollHeight - 1`, "the row is as tall
 * as its content" — is true at EVERY frame of the opening animation in WebKit.
 * Measured there, the row and its `scrollHeight` walk up together:
 *
 *   t=  4  height 16.78  scrollHeight 17
 *   t= 94  height 86.02  scrollHeight 86
 *   t=293  height 135.5  scrollHeight 136
 *
 * so the predicate is satisfied by the row's *starting* value — 16.78px, which is
 * the inner's open `padding-block` (`0.2rem 0.85rem`) and nothing else. Every
 * measurement gated on it was a sample of the animation. Chromium reports the
 * full clipped content as `scrollHeight` instead, so the same predicate reads as
 * correct there: one engine passing and one failing, for a reason that has
 * nothing to do with the product.
 *
 * ## What it waits on instead
 *
 * `getAnimations({ subtree: true })` covers CSS transitions and animations alike
 * and reads `running` for the whole 320ms of the open (40ms delay + 280ms) in
 * every engine, clearing exactly when the row lands. Three consecutive equal
 * samples are required on top of that, because a poll can in principle land
 * before the click's style resolution has started the transition — and "not
 * animating yet" is indistinguishable from "finished" at that instant. Three
 * samples span ~350ms at `expect.poll`'s backoff, which is longer than the
 * transition, so a transition that was going to run is always seen running.
 *
 * Measured end state for the home evidence key: height 342, scrollHeight 342, in
 * both Chromium and WebKit.
 */
export async function waitForDisclosureSettled(locator, timeout = 5000) {
  /** Consecutive samples that have all reported the same height. */
  let stable = 0;
  let previous = null;
  await expect
    .poll(
      async () => {
        const state = await locator.evaluate((element) => {
          const flow = element.querySelector('.disclosure-flow');
          return {
            height: flow ? +flow.getBoundingClientRect().height.toFixed(2) : null,
            animating: element
              .getAnimations({ subtree: true })
              .some((animation) => animation.playState === 'running'),
          };
        });
        stable =
          state.height !== null && state.height === previous && !state.animating ? stable + 1 : 0;
        previous = state.height;
        /* A row that never leaves its padding residual is not "settled", it is
           stuck — so the floor is one full line, not one pixel. */
        return state.height > 1 && stable >= 3;
      },
      { timeout, message: 'disclosure row did not finish filling' },
    )
    .toBe(true);
}

export async function waitForDisclosureClosed(locator, timeout = 2000) {
  await expect
    .poll(
      async () => {
        const state = await measureDisclosure(locator);
        return state.open === false && state.closing === false && (state.flowHeight ?? 0) < 1;
      },
      { timeout, message: 'disclosure did not settle closed' },
    )
    .toBe(true);
}
