import { bindDisclosureController } from '../../src/lib/disclosure-controller.mjs';

export function createElement({ tag = 'div', classes = [], parent = null, open = false } = {}) {
  const values = new Set(classes);
  const node = {
    tagName: tag,
    open,
    parentElement: parent,
    children: [],
    classList: {
      contains: (name) => values.has(name),
    },
    attributes: new Map(),
    getAttribute(name) {
      return node.attributes.has(name) ? node.attributes.get(name) : null;
    },
    setAttribute(name, value) {
      node.attributes.set(name, String(value));
    },
    removeAttribute(name) {
      node.attributes.delete(name);
    },
    hasAttribute(name) {
      return node.attributes.has(name);
    },
    matches(selector) {
      return selector === node.tagName || values.has(selector);
    },
    closest(selector) {
      for (let current = node; current; current = current.parentElement) {
        if (current.matches(selector)) {
          return current;
        }
      }
      return null;
    },
  };
  return node;
}

export function createTree({ open = true, withFlow = true } = {}) {
  const details = createElement({ tag: 'details', open });
  const summary = createElement({ tag: 'summary', parent: details });
  details.children.push(summary);
  if (!withFlow) {
    return { details, summary, flow: null, inner: null, body: null };
  }
  const flow = createElement({ classes: ['disclosure-flow'], parent: details });
  const inner = createElement({ classes: ['disclosure-flow-inner'], parent: flow });
  const body = createElement({ tag: 'p', parent: inner });
  flow.children.push(inner);
  inner.children.push(body);
  details.children.push(flow);
  return { details, summary, flow, inner, body };
}

export function createNestedTree() {
  const outer = createTree();
  const inner = createTree();
  inner.details.parentElement = outer.inner;
  outer.inner.children.push(inner.details);
  return { ...outer, nested: inner };
}

export function nestDisclosures(...trees) {
  const [outer, ...rest] = trees;
  let host = outer.inner;
  for (const tree of rest) {
    tree.details.parentElement = host;
    host.children.push(tree.details);
    host = tree.inner;
  }
  return { outer, innermost: trees.at(-1) };
}

export function createDocument() {
  const listeners = new Map();
  return {
    addEventListener(type, handler) {
      const handlers = listeners.get(type) ?? [];
      handlers.push(handler);
      listeners.set(type, handlers);
    },
    listenerCount(type) {
      return (listeners.get(type) ?? []).length;
    },
    dispatch(type, event) {
      for (const handler of listeners.get(type) ?? []) {
        handler(event);
      }
    },
  };
}

export function createClock() {
  const scheduled = new Map();
  let nextId = 1;
  return {
    setTimeout(callback, delay) {
      const id = nextId;
      nextId += 1;
      scheduled.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id) {
      scheduled.delete(id);
    },
    delays() {
      return [...scheduled.values()].map((entry) => entry.delay);
    },
    ids() {
      return [...scheduled.keys()];
    },
    run(id) {
      const entry = scheduled.get(id);
      if (!entry) {
        return false;
      }
      scheduled.delete(id);
      entry.callback();
      return true;
    },
    flush() {
      for (const [id, entry] of scheduled) {
        scheduled.delete(id);
        entry.callback();
      }
    },
  };
}

export function createHarness({
  reducedMotion = false,
  provideClearTimeout = true,
  provideWindowClearTimeout = false,
} = {}) {
  const document = createDocument();
  const cleared = [];
  const window = {
    matchMedia: () => ({ matches: reducedMotion }),
    ...(provideWindowClearTimeout ? { clearTimeout: (id) => cleared.push(id) } : {}),
  };
  const clock = createClock();
  const dependencies = {
    document,
    window,
    setTimeout: clock.setTimeout,
    ...(provideClearTimeout ? { clearTimeout: clock.clearTimeout } : {}),
  };
  return {
    document,
    window,
    clock,
    cleared,
    dependencies,
    controller: bindDisclosureController(dependencies),
  };
}

export const createClick = (target) => {
  const state = { prevented: 0 };
  return {
    state,
    event: {
      target,
      preventDefault() {
        state.prevented += 1;
      },
    },
  };
};

export const transitionEnd = (target, propertyName = 'grid-template-rows') => ({
  target,
  propertyName,
});
