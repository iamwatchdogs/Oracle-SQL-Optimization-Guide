import { createWindow } from './reading-toc-window.fixtures.mjs';
import { createReadingTocController } from '../../src/lib/reading-toc-controller.mjs';

/*
 * Fakes for the reading table of contents.
 * * Two details are load-bearing and would otherwise be invisible:
 *
 * 1. A bare `#id` is only a valid CSS selector when the id starts with a
 *    letter or underscore. 205 of the 294 heading ids this project ships start
 *    with a digit (`#1-choose-one-target`), and `querySelector` throws a
 *    `SyntaxError` for those in every engine. `querySelector` here reproduces
 *    that throw so the `findById` scan fallback is exercised, not bypassed.
 * 2. The active label is read from the link's LAST element child — the
 *    heading-text span. The ordinal span in front of it is a visual index and
 *    is `aria-hidden`, so including it would prefix every announcement with
 *    "01 ". Each fake link therefore models the real two-span structure instead
 *    of a synthetic text node only the retired `.truncate, span:last-child`
 *    query could reach.
 */

const CSS_IDENTIFIER = /^-?[_A-Za-z][\w-]*$/u;

export const IN_VIEWPORT_HEIGHT = 800;
export const BAND_TOP = IN_VIEWPORT_HEIGHT * 0.15;
export const BAND_BOTTOM = IN_VIEWPORT_HEIGHT * 0.35;

function createRectProbe(node) {
  return {
    getBoundingClientRect() {
      node.rectCalls += 1;
      return node.rect;
    },
    /*
     * Rects are read more than once per entry and in an order the retired
     * `entries[0]`-only gate never produced, so a test has to be able to move a
     * heading after the controller has been wired up.
     */
    setRect(next) {
      node.rect = { ...next };
      return node;
    },
  };
}

export function createFakeNode({
  id = '',
  dataset = {},
  text = '',
  rect = { top: 0, bottom: 0 },
} = {}) {
  const node = {
    id,
    dataset: { ...dataset },
    text,
    textContent: text,
    rect: { ...rect },
    rectCalls: 0,
    listeners: [],
    attributes: new Map(),
    scrollCalls: [],
    /* The trailing label span, and the ordinal span that precedes it. */
    lastElementChild: { textContent: text },
    firstElementChild: { textContent: '01', attributes: new Map() },
    getAttribute(name) {
      if (name === 'data-active') {
        return node.dataset.active ?? null;
      }
      return node.attributes.get(name) ?? null;
    },
    setAttribute(name, value) {
      node.attributes.set(name, String(value));
    },
    removeAttribute(name) {
      node.attributes.delete(name);
    },
    addEventListener(type, handler, options) {
      node.listeners.push({ type, handler, options });
    },
    dispatch(type) {
      for (const listener of node.listeners) {
        if (listener.type === type && !listener.options?.signal?.aborted) {
          listener.handler();
        }
      }
    },
    scrollIntoView(options) {
      node.scrollCalls.push(options);
    },
  };

  return Object.assign(node, createRectProbe(node));
}

export function createObserverClass() {
  const instances = [];

  class Observer {
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      this.observed = [];
      this.disconnectCalls = 0;
      instances.push(this);
    }

    observe(element) {
      this.observed.push(element);
    }

    disconnect() {
      this.disconnectCalls += 1;
    }
  }

  return Object.assign(Observer, { instances });
}

/*
 * A window stand-in with a hand-driven rAF queue and a scroll listener.
 *
 * `requestAnimationFrame` is queued rather than real so a test decides when the
 * frame happens: the scroll-spy coalesces to one measurement per frame, and a
 * timer-based fake would make these tests depend on wall-clock scheduling.
 */
/*
 * `document.getElementById`-style lookup, used to confirm an id is a usable CSS
 * selector before it reaches `querySelector`. An id that cannot be escaped would
 * otherwise throw a `SyntaxError` out of the controller.
 */
function sectionById(selector, sections, documentRef) {
  const id = selector.slice(1);
  if (!CSS_IDENTIFIER.test(id)) {
    documentRef.invalidSelectorQueries += 1;
    throw new SyntaxError(`'${selector}' is not a valid selector`);
  }
  return sections.get(id) ?? null;
}

export function createHarness({
  links,
  sections,
  currentLabel,
  mobile,
  hash = '',
  scrollY = 0,
  maxScroll = 0,
}) {
  const documentListeners = new Map();
  const sectionNodes = [...sections.values()];
  const windowRef = createWindow({ hash, scrollY, innerHeight: IN_VIEWPORT_HEIGHT });
  const documentRef = {
    invalidSelectorQueries: 0,
    querySelectorAll(selector) {
      return selector === '[data-toc-link]' ? links : [];
    },
    querySelector(selector) {
      if (selector.startsWith('#')) {
        return sectionById(selector, sections, documentRef);
      }
      if (selector === '[data-toc-mobile-current]') {
        return currentLabel;
      }
      if (selector === '[data-toc-mobile]') {
        return mobile;
      }
      return null;
    },
    getElementsByTagName(tag) {
      return tag === '*' ? sectionNodes : [];
    },
    documentElement: { scrollHeight: IN_VIEWPORT_HEIGHT + maxScroll },
    addEventListener(type, handler) {
      const handlers = documentListeners.get(type) ?? [];
      handlers.push(handler);
      documentListeners.set(type, handlers);
    },
    dispatch(type) {
      for (const handler of documentListeners.get(type) ?? []) {
        handler();
      }
    },
  };

  return { documentRef, Observer: createObserverClass(), windowRef };
}

export function buildController({ documentRef, Observer, windowRef }) {
  return createReadingTocController({
    document: documentRef,
    window: windowRef,
    IntersectionObserver: Observer,
  });
}

export function runPageLoad(options) {
  const harness = createHarness(options);
  const controller = buildController(harness);

  controller.pageLoad();
  return { ...harness, controller };
}
