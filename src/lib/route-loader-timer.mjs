/*
 * Timer plumbing for the route loader, split out so `route-loader.mjs` stays
 * about navigation state.
 *
 * Two timers are armed per navigation and share one `clear()`:
 *   - the 180ms reveal gate, which shows the skeleton and publishes the live
 *     message, and
 *   - an 8000ms hard cap, because Astro's default route loader has no timeout —
 *     a fetch that stalls but never closes leaves the transition promise
 *     unsettled, so `astro:page-load` never fires and the skeleton would stay up
 *     with a permanently announcing `role="status"` region and no code path back.
 *
 * `getTimerFunctions` resolves a timer source in a fixed order — an explicit
 * dependency, then `window`, then the global — because the reveal delay is the
 * one thing the loader must not silently lose when a host injects a partial
 * dependency object.
 */

export const LOADER_DELAY = 180;
export const LOADER_MAX_VISIBLE_MS = 8000;

export function getTimerFunctions(timer, windowRef, dependencies) {
  if (typeof timer?.setTimeout === 'function') {
    return {
      clearTimeout: timer.clearTimeout?.bind(timer),
      setTimeout: timer.setTimeout.bind(timer),
    };
  }

  if (typeof dependencies?.setTimeout === 'function') {
    return {
      clearTimeout: dependencies.clearTimeout?.bind(dependencies),
      setTimeout: dependencies.setTimeout.bind(dependencies),
    };
  }

  if (typeof windowRef?.setTimeout === 'function') {
    return {
      clearTimeout: windowRef.clearTimeout?.bind(windowRef),
      setTimeout: windowRef.setTimeout.bind(windowRef),
    };
  }

  return {
    clearTimeout: globalThis.clearTimeout?.bind(globalThis),
    setTimeout: globalThis.setTimeout.bind(globalThis),
  };
}

export function createTimerController(timerFunctions) {
  let revealId;
  let capId;
  let revealScheduled = false;
  let capScheduled = false;

  const clear = () => {
    if (revealScheduled) {
      timerFunctions.clearTimeout?.(revealId);
    }
    if (capScheduled) {
      timerFunctions.clearTimeout?.(capId);
    }
    revealId = undefined;
    capId = undefined;
    revealScheduled = false;
    capScheduled = false;
  };

  const schedule = (callback) => {
    clear();
    revealScheduled = true;
    const id = timerFunctions.setTimeout(() => {
      revealId = undefined;
      revealScheduled = false;
      callback();
    }, LOADER_DELAY);
    if (revealScheduled) {
      revealId = id;
    }
  };

  const scheduleCap = (callback) => {
    capScheduled = true;
    const id = timerFunctions.setTimeout(() => {
      capId = undefined;
      capScheduled = false;
      callback();
    }, LOADER_MAX_VISIBLE_MS);
    if (capScheduled) {
      capId = id;
    }
  };

  return { clear, schedule, scheduleCap };
}
