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
 * Wait until a disclosure's row has reached its natural height.
 *
 * `waitForDisclosureOpen` is satisfied as soon as the row is visibly growing, so
 * it is the right wait for "the content is reachable" and the wrong one for
 * anything measured after the row finishes: the panel is still moving. This waits
 * on the same criterion the re-anchor uses, so a test that measures a settled
 * position is reading the position the re-anchor aimed at.
 *
 * Measured end state for the home evidence key: height 342, scrollHeight 342, in
 * both Chromium and WebKit.
 */
export async function waitForDisclosureSettled(locator, timeout = 3000) {
  await expect
    .poll(
      async () => {
        const state = await measureDisclosure(locator);
        if (state.flowHeight === null || state.flowNaturalHeight === null) {
          return false;
        }
        return state.flowHeight >= state.flowNaturalHeight - 1;
      },
      { timeout, message: 'disclosure row did not reach its natural height' },
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
