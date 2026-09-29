/**
 * Doubles for the re-anchor specs.
 *
 * The project keeps its test doubles in `test/fixtures/` and the specs in
 * `test/unit/`, and the split is load-bearing rather than cosmetic: a spec file
 * that also carries its fakes ends up as long as the module it is testing, and
 * the reader has to hold both in mind at once.
 *
 * Two things here are deliberately MORE faithful than a convenient fake.
 *
 * - `requestAnimationFrame` callbacks are invoked with a timestamp, as a browser
 *   does. A fake that called them with no argument made a real bug invisible: the
 *   re-anchor shared one guard between its frame path and its transition-event
 *   path, `event.target` is `undefined` for both `undefined` and a number, and
 *   the frame path was therefore rejected in production and green in CI.
 * - Timers are queued on the WINDOW, not the global, because the re-anchor sets
 *   its fallback with `window.setTimeout`.
 */

/**
 * A `.disclosure-flow` stand-in with a settable height.
 *
 * The height matters because the re-anchor waits on the row reaching its natural
 * height rather than on a transition event: a row mid-grow reports a height below
 * `scrollHeight`, and a finished one does not. A fake with a constant height
 * would let the wait converge instantly and prove nothing.
 */
export const createFlow = (initial = {}) => {
  const listeners = new Map();
  let height = initial.height ?? 0;
  let natural = initial.naturalHeight ?? 0;

  const flow = {
    setHeight(next) {
      height = next;
    },
    /** The height the row settles at once fully open. */
    setNaturalHeight(next) {
      natural = next;
    },
    /**
     * Fire a transition event. `target` defaults to the flow itself, which is the
     * only case the module's guard accepts — a descendant's `transitionend`
     * bubbles up and must be ignored.
     */
    fire(type, target = flow) {
      listeners.get(type)?.({ target });
    },
    getBoundingClientRect: () => ({ height }),
    get scrollHeight() {
      return natural;
    },
    get attached() {
      return listeners.size;
    },
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
  };
  return flow;
};

/** The element the re-anchor scrolls to, counting how often it was asked to. */
export const createTarget = () => {
  const target = { calls: 0 };
  target.scrollIntoView = () => {
    target.calls += 1;
  };
  return target;
};

/**
 * A window double with controllable reduced-motion, animation frames and timers.
 *
 * `runFrames` and `runTimers` both DRAIN what they run, because the module is
 * meant to release the losers once a path has won — a fake that kept them
 * pending would hide that.
 */
export const createWindow = ({ reducedMotion = false } = {}) => {
  const frames = [];
  const clock = { now: 0 };
  const timers = new Map();

  /* The clock exists because the wait is bounded in wall-clock milliseconds, not
   * frames, since a frame count is display-rate dependent. A test can therefore
   * reach the deadline deliberately instead of grinding through frames. */
  const runFrame = (ms = 16) => {
    clock.now += ms;
    for (const callback of frames.splice(0)) {
      callback(clock.now);
    }
  };

  return {
    frames,
    timers,
    matchMedia: (query) => ({ matches: query.includes('reduce') ? reducedMotion : false }),
    requestAnimationFrame(callback) {
      frames.push(callback);
      return frames.length;
    },
    runFrame,
    runFrames: (count = 1) => {
      for (let step = 0; step < count; step += 1) {
        runFrame();
      }
    },
    runFramesUntil(done, budget = 80) {
      for (let step = 0; step < budget && !done(); step += 1) {
        runFrame();
      }
    },
    ...createTimers(timers),
  };
};

/**
 * The `setTimeout` half of the window fake, kept out of `createWindow` so neither
 * function grows past the lint limit.
 */
const createTimers = (timers) => {
  let nextId = 1;
  return {
    setTimeout(callback, ms) {
      const id = nextId++;
      timers.set(id, { callback, ms });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    runTimers() {
      for (const { callback } of [...timers.values()].splice(0)) {
        callback();
      }
    },
  };
};

/** The container the re-anchor is pointed at, with or without a flow. */
export const createContainer = (flow, { open = true, closing = false } = {}) => ({
  attributes: new Set(open ? ['open'] : []),
  dataset: closing ? { disclosureClosing: '' } : {},
  hasAttribute: (name) => (name === 'open' ? open && !closing : false),
  querySelector: (selector) => (selector === '.disclosure-flow' ? (flow ?? null) : null),
});

/** Fire a transition whose target is a descendant, which must NOT settle. */
export const fireDescendantTransition = (flow) => flow.fire('transitionend', { tagName: 'SPAN' });
