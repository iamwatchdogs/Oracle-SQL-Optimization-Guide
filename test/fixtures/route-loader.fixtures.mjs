import { createRouteLoaderController } from '../../src/lib/route-loader.mjs';

/*
 * A deliberately faithful DOM element: no `dataset` mirror.
 *
 * The controller now writes loader visibility with `setAttribute` only. A fake
 * that also mirrored `data-visible` onto a plain-object `dataset` would keep
 * passing even if the attribute never reached the bag, which is exactly the
 * regression this fixture used to hide — `data-[visible=true]:opacity-100` is an
 * attribute selector, and a JS-only property is invisible to it.
 */
export class FakeElement {
  constructor(attributes = {}) {
    this.attributes = new Map(Object.entries(attributes));
    this.focusCalls = [];
    this.textContent = '';
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  focus(options) {
    this.focusCalls.push(options);
  }
}

/*
 * A virtual clock, because the controller arms TWO timers per navigation: the
 * 180ms reveal gate and an 8000ms hard cap. `advanceTo` fires them in delay
 * order and keeps `now` consistent, so a test can cross the cap without ever
 * settling `pageLoad` — which is the stalled-navigation case the cap exists for.
 */
const createTicker = () => ({ now: 0, nextId: 0, callbacks: new Map(), pending: new Map() });

const fire = (ticker, id) => {
  const callback = ticker.callbacks.get(id);
  if (!callback) {
    return;
  }
  ticker.pending.delete(id);
  callback();
};

const fireByDelay = (ticker, predicate) => {
  for (const [id, entry] of ticker.pending) {
    if (predicate(entry)) {
      fire(ticker, id);
      return;
    }
  }
};

/* Fire every timer due at or before `target`, earliest first. */
const advanceTo = (ticker, target) => {
  for (;;) {
    const due = [...ticker.pending.entries()]
      .filter(([, entry]) => entry.at <= target)
      .toSorted(([, left], [, right]) => left.at - right.at);
    if (due.length === 0) {
      break;
    }
    fire(ticker, due[0][0]);
  }
  ticker.now = Math.max(ticker.now, target);
};

function createClock() {
  const ticker = createTicker();

  return {
    callbacks: ticker.callbacks,
    pending: ticker.pending,
    get now() {
      return ticker.now;
    },
    clearTimeout(id) {
      ticker.pending.delete(id);
    },
    run(id) {
      fire(ticker, id);
    },
    setTimeout(callback, delay) {
      ticker.nextId += 1;
      ticker.callbacks.set(ticker.nextId, callback);
      ticker.pending.set(ticker.nextId, { callback, delay, at: ticker.now + delay });
      return ticker.nextId;
    },
    advanceTo(target) {
      advanceTo(ticker, target);
    },
    advanceBy(milliseconds) {
      advanceTo(ticker, ticker.now + milliseconds);
    },
    runAt(delay) {
      fireByDelay(ticker, (entry) => entry.delay === delay);
    },
    runBefore(delay) {
      fireByDelay(ticker, (entry) => entry.delay < delay);
    },
  };
}

/*
 * Reads the `data-visible` ATTRIBUTE, deliberately not `dataset`.
 *
 * The loader's reveal utility is `data-[visible=true]:opacity-100`, an
 * attribute selector. A `dataset` read would pass against a fake that never
 * wrote the attribute at all, which is exactly the regression the retired
 * `loader.dataset` branch caused: writing to a plain object's `dataset`
 * produced no attribute, so the loader stayed at `opacity-0` all navigation.
 */
export const visibleAttribute = (element) => element.attributes.get('data-visible') ?? null;

export function createHarness() {
  const main = new FakeElement();
  const loader = new FakeElement({ 'data-visible': 'false' });
  loader.message = new FakeElement();
  const document = {
    loader,
    main,
    querySelector(selector) {
      if (selector === 'main#main' || selector === 'main') {
        return this.main;
      }
      if (selector === '[data-route-loader]' || selector === '#route-loader') {
        return this.loader;
      }
      if (selector === '[data-route-loader-message]') {
        return this.loader.message;
      }
      return null;
    },
  };
  const timer = createClock();
  const window = {
    scrollToCalls: [],
    scrollTo(options) {
      this.scrollToCalls.push(options);
    },
  };
  const controller = createRouteLoaderController({ document, timer, window });

  return { controller, document, loader, main, message: loader.message, timer, window };
}

export const REVEAL_DELAY_MS = 180;
export const MAX_VISIBLE_MS = 8000;

export function createTrackedSignal() {
  const listeners = new Set();
  return {
    aborted: false,
    addEventListener(_type, handler) {
      listeners.add(handler);
    },
    removeEventListener(_type, handler) {
      listeners.delete(handler);
    },
    get listenerCount() {
      return listeners.size;
    },
    abort() {
      this.aborted = true;
      for (const handler of listeners) {
        handler();
      }
    },
  };
}
