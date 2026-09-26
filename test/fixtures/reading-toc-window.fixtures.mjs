/*
 * The `window` double for the reading-TOC specs.
 *
 * Split out of `reading-toc.fixtures.mjs` because a window is a different
 * concern from a document, and keeping them together pushed the pair past the
 * file-size budget.
 *
 * Two things here are deliberately MORE faithful than a convenient fake:
 *
 * - `requestAnimationFrame` callbacks are invoked with a timestamp, as a browser
 *   does. A fixture that called them with no argument made a real bug invisible:
 *   `src/lib/disclosure-reanchor.mjs` shared one guard between its frame path
 *   and its transition-event path, and `event.target` is `undefined` for both
 *   `undefined` and a number, so the frame path was rejected in production and
 *   green in CI.
 * - Timers are queued on the WINDOW, not the global, because the re-anchor sets
 *   its fallback with `window.setTimeout`. Stubbing the global would never be
 *   called, and the fallback would look untested.
 */
/*
 * A manual timer queue, mirroring the rAF queue above.
 *
 * The re-anchor sets its fallback timeout on the WINDOW, not the global, so a
 * test has to drive it here — stubbing the global `setTimeout` would never be
 * called and the fallback would look untested.
 */
function createTimers() {
  const timers = [];
  let nextId = 1;
  return {
    setTimeout(callback, ms) {
      const id = nextId++;
      timers.push({ callback, id, ms });
      return id;
    },
    clearTimeout(id) {
      const index = timers.findIndex((timer) => timer.id === id);
      if (index !== -1) {
        timers.splice(index, 1);
      }
    },
    pending() {
      return timers.length;
    },
    runAll() {
      for (const timer of timers.splice(0)) {
        timer.callback();
      }
    },
  };
}

/*
 * A hand-driven rAF queue. The clock starts ABOVE zero on purpose: a browser
 * passes milliseconds since page load, and a leading `0` is FALSY, which is
 * precisely the convenient accident that lets an `event && ...` guard pass in CI
 * and fail in production.
 */
function createFrames() {
  let queue = new Map();
  let nextId = 1;
  let clock = 1000;
  return {
    request(callback) {
      const id = nextId++;
      queue.set(id, callback);
      return id;
    },
    cancel(id) {
      queue.delete(id);
    },
    take() {
      const queued = queue;
      queue = new Map();
      return [...queued.values()];
    },
    clock: () => clock++,
    pending: () => queue.size,
  };
}

/* A listener registry, so the window fake stays inside its line budget. */
function createEventTarget() {
  const listeners = new Map();
  return {
    add(type, handler) {
      const handlers = listeners.get(type) ?? [];
      handlers.push(handler);
      listeners.set(type, handlers);
    },
    remove(type, handler) {
      listeners.set(
        type,
        (listeners.get(type) ?? []).filter((entry) => entry !== handler),
      );
    },
    dispatch(type) {
      // Snapshot: a handler may add or remove listeners while this runs.
      for (const handler of (listeners.get(type) ?? []).slice()) {
        handler();
      }
    },
  };
}

export function createWindow({ hash, scrollY, innerHeight }) {
  const windowListeners = createEventTarget();
  const frames = createFrames();
  const timers = createTimers();
  return {
    innerHeight,
    scrollY,
    location: { hash },
    matchMedia: () => ({ matches: true }),
    addEventListener: windowListeners.add,
    removeEventListener: windowListeners.remove,
    dispatchEvent: windowListeners.dispatch,
    requestAnimationFrame: frames.request,
    cancelAnimationFrame: frames.cancel,
    runAnimationFrames() {
      for (const callback of frames.take()) {
        /*
         * Pass a timestamp, as a browser does. Calling the callback with no
         * argument made `src/lib/disclosure-reanchor.mjs` look correct: its
         * frame path shared a guard with the transition-event path, and
         * `event.target` on `undefined` is `undefined`, so the guard passed.
         * A real `requestAnimationFrame` hands back a `DOMHighResTimeStamp`, so
         * `event.target` is `undefined` there too and the guard REJECTS — the
         * path was dead in production and green here. A fake that is more
         * forgiving than the platform hides exactly this class of bug.
         */
        callback(frames.clock());
      }
    },
    pendingFrames: frames.pending,
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
    pendingTimers: timers.pending,
    runTimers: timers.runAll,
  };
}
