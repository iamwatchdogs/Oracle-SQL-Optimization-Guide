import { createRouteLoaderController } from '../../src/lib/route-loader.mjs';

export class FakeElement {
  constructor(attributes = {}) {
    this.attributes = new Map(Object.entries(attributes));
    this.dataset = {};
    this.focusCalls = [];
    this.textContent = '';
    const visible = this.attributes.get('data-visible');
    if (visible !== undefined) {
      this.dataset.visible = visible;
    }
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  setAttribute(name, value) {
    const stringValue = String(value);
    this.attributes.set(name, stringValue);
    if (name === 'data-visible') {
      this.dataset.visible = stringValue;
    }
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  focus(options) {
    this.focusCalls.push(options);
  }
}

function createTimer() {
  let nextId = 0;
  const callbacks = new Map();
  const pending = new Map();

  return {
    callbacks,
    clearTimeout(id) {
      pending.delete(id);
    },
    pending,
    run(id) {
      const callback = callbacks.get(id);
      if (!callback) {
        return;
      }
      pending.delete(id);
      callback();
    },
    runAt(delay) {
      for (const [id, entry] of pending) {
        if (entry.delay === delay) {
          this.run(id);
          return;
        }
      }
    },
    runBefore(delay) {
      for (const [id, entry] of pending) {
        if (entry.delay < delay) {
          this.run(id);
          return;
        }
      }
    },
    setTimeout(callback, delay) {
      const id = ++nextId;
      callbacks.set(id, callback);
      pending.set(id, { callback, delay });
      return id;
    },
  };
}

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
  const timer = createTimer();
  const window = {
    scrollToCalls: [],
    scrollTo(options) {
      this.scrollToCalls.push(options);
    },
  };
  const controller = createRouteLoaderController({ document, timer, window });

  return { controller, document, loader, main, message: loader.message, timer, window };
}

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
