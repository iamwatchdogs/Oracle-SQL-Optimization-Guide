import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import { createReadingTocController } from '../../src/lib/reading-toc-controller.mjs';

const readSource = (relativePath) => readFile(new URL(relativePath, import.meta.url), 'utf8');

function createFakeNode({ id = '', dataset = {}, text = '', rect = { top: 0, bottom: 0 } } = {}) {
  const node = {
    id,
    dataset: { ...dataset },
    text,
    textContent: text,
    rect,
    textNode: { textContent: text },
    listeners: [],
    attributes: new Map(),
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
    getBoundingClientRect() {
      return node.rect;
    },
    querySelector(selector) {
      return selector === '.truncate, span:last-child' ? node.textNode : null;
    },
  };
  return node;
}

function createObserverClass() {
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

function createHarness({ links, sections, currentLabel, mobile, hash = '', scrollY = 0 }) {
  const documentListeners = new Map();
  const windowRef = {
    innerHeight: 800,
    scrollY,
    location: { hash },
    matchMedia: () => ({ matches: true }),
  };
  const documentRef = {
    querySelectorAll(selector) {
      return selector === '[data-toc-link]' ? links : [];
    },
    querySelector(selector) {
      if (selector.startsWith('#')) {
        return sections.get(selector.slice(1)) ?? null;
      }
      if (selector === '[data-toc-mobile-current]') {
        return currentLabel;
      }
      if (selector === '[data-toc-mobile]') {
        return mobile;
      }
      return null;
    },
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
  const Observer = createObserverClass();

  return { documentRef, Observer, windowRef };
}

const pageLoad = ({ links, sections, currentLabel, mobile, hash = '', scrollY = 0 }) => {
  const { documentRef, Observer, windowRef } = createHarness({
    links,
    sections,
    currentLabel,
    mobile,
    hash,
    scrollY,
  });
  const controller = createReadingTocController({
    document: documentRef,
    window: windowRef,
    IntersectionObserver: Observer,
  });

  controller.pageLoad();
  return controller;
};

test('uses the first matched heading for initial no-hash state', () => {
  const missing = createFakeNode({ dataset: { tocLink: 'missing', active: 'false' } });
  const intro = createFakeNode({ dataset: { tocLink: 'intro' }, text: 'Intro' });
  const other = createFakeNode({ dataset: { tocLink: 'other' }, text: 'Other' });
  const currentLabel = createFakeNode();
  const sections = new Map([
    ['intro', createFakeNode({ id: 'intro', rect: { top: 100, bottom: 200 } })],
    ['other', createFakeNode({ id: 'other', rect: { top: 800, bottom: 900 } })],
  ]);

  pageLoad({
    links: [missing, intro, other],
    sections,
    currentLabel,
    mobile: createFakeNode(),
  });

  expect(missing.dataset.active).toBe('false');
  expect(intro.dataset.active).toBe('true');
  expect(other.dataset.active).toBe('false');
  expect(currentLabel.textContent).toBe('Intro');
});

test('activates the first matched heading at the top of the page, band or not', () => {
  const missing = createFakeNode({ dataset: { tocLink: 'missing', active: 'false' } });
  const intro = createFakeNode({ dataset: { tocLink: 'intro' }, text: 'Intro' });
  const other = createFakeNode({ dataset: { tocLink: 'other' }, text: 'Other' });
  const currentLabel = createFakeNode();
  const mobile = createFakeNode();
  const sections = new Map([
    ['intro', createFakeNode({ id: 'intro', rect: { top: 900, bottom: 1000 } })],
    ['other', createFakeNode({ id: 'other', rect: { top: 1400, bottom: 1500 } })],
  ]);
  const { documentRef, Observer, windowRef } = createHarness({
    links: [missing, intro, other],
    sections,
    currentLabel,
    mobile,
    scrollY: 0,
  });
  const controller = createReadingTocController({
    document: documentRef,
    window: windowRef,
    IntersectionObserver: Observer,
  });

  controller.pageLoad();

  expect(missing.dataset.active).toBe('false');
  expect(intro.dataset.active).toBe('true');
  expect(other.dataset.active).toBe('false');
  expect(currentLabel.textContent).toBe('Intro');
});

test('leaves the band gate in charge once the page is scrolled or restored', () => {
  const intro = createFakeNode({ dataset: { tocLink: 'intro', active: 'false' }, text: 'Intro' });
  const currentLabel = createFakeNode();

  pageLoad({
    links: [intro],
    sections: new Map([
      ['intro', createFakeNode({ id: 'intro', rect: { top: 900, bottom: 1000 } })],
    ]),
    currentLabel,
    mobile: createFakeNode(),
    scrollY: 640,
  });

  expect(intro.dataset.active).toBe('false');
  expect(intro.getAttribute('aria-current')).toBeNull();
  expect(currentLabel.textContent).toBe('');
});

test('a restored scroll inside the band still activates the first matched heading', () => {
  const intro = createFakeNode({ dataset: { tocLink: 'intro' }, text: 'Intro' });
  const currentLabel = createFakeNode();

  pageLoad({
    links: [intro],
    sections: new Map([
      ['intro', createFakeNode({ id: 'intro', rect: { top: 100, bottom: 200 } })],
    ]),
    currentLabel,
    mobile: createFakeNode(),
    scrollY: 640,
  });

  expect(intro.dataset.active).toBe('true');
  expect(currentLabel.textContent).toBe('Intro');
});

test('replaces observers and aborts link listeners across repeated page loads', () => {
  const link = createFakeNode({ dataset: { tocLink: 'intro' }, text: 'Intro' });
  const currentLabel = createFakeNode();
  const mobile = createFakeNode();
  const sections = new Map([
    ['intro', createFakeNode({ id: 'intro', rect: { top: 100, bottom: 200 } })],
  ]);
  const { documentRef, Observer, windowRef } = createHarness({
    links: [link],
    sections,
    currentLabel,
    mobile,
  });
  const controller = createReadingTocController({
    document: documentRef,
    window: windowRef,
    IntersectionObserver: Observer,
  });

  documentRef.dispatch('astro:page-load');
  const firstObserver = Observer.instances[0];
  const firstSignal = link.listeners[0].options.signal;
  documentRef.dispatch('astro:page-load');
  const secondObserver = Observer.instances[1];
  const secondSignal = link.listeners[1].options.signal;

  expect(firstObserver.disconnectCalls).toBe(1);
  expect(firstSignal.aborted).toBe(true);
  expect(secondObserver).toBeDefined();
  expect(secondSignal.aborted).toBe(false);

  documentRef.dispatch('astro:before-swap');

  expect(secondObserver.disconnectCalls).toBe(1);
  expect(secondSignal.aborted).toBe(true);
  expect(controller.beforeSwap).toBeDefined();
});

test('keeps hash synchronization and aria-current state', () => {
  const intro = createFakeNode({ dataset: { tocLink: 'intro' }, text: 'Intro' });
  const other = createFakeNode({ dataset: { tocLink: 'other' }, text: 'Other' });
  const currentLabel = createFakeNode();
  const sections = new Map([
    ['intro', createFakeNode({ id: 'intro', rect: { top: 800, bottom: 900 } })],
    ['other', createFakeNode({ id: 'other', rect: { top: 100, bottom: 200 } })],
  ]);

  pageLoad({
    links: [intro, other],
    sections,
    currentLabel,
    mobile: createFakeNode(),
    hash: '#other',
  });

  expect(intro.dataset.active).toBe('false');
  expect(intro.getAttribute('aria-current')).toBeNull();
  expect(other.dataset.active).toBe('true');
  expect(other.getAttribute('aria-current')).toBe('location');
  expect(currentLabel.textContent).toBe('Other');
});

test('keeps the mobile current-section text out of live announcements', async () => {
  const source = await readSource('../../src/components/ReadingToc.astro');

  expect(source).toContain('data-toc-mobile-current');
  expect(source).not.toContain('aria-live');
});
