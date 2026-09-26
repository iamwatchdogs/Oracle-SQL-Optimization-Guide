import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import { bindThemeController } from '../../src/lib/theme-controller.mjs';

const readSource = (relativePath) => readFile(new URL(relativePath, import.meta.url), 'utf8');
const THEME_CONTROLLER_KEY = Symbol.for('guidebook.theme-controller');

function createHarness() {
  const root = { dataset: { theme: 'dark' } };
  const toggle = {
    id: 'theme-toggle',
    closest: () => toggle,
    setAttribute: () => {},
  };
  const storage = {
    getItem: () => null,
    setItem: () => {},
  };
  const document = {
    documentElement: root,
    listeners: new Map(),
    querySelector(selector) {
      return selector === '#theme-toggle' ? toggle : selector === 'documentElement' ? root : null;
    },
    addEventListener(type, handler) {
      const handlers = this.listeners.get(type) ?? [];
      handlers.push(handler);
      this.listeners.set(type, handlers);
    },
    listenerCount(type) {
      return (this.listeners.get(type) ?? []).length;
    },
  };
  return { document, root, storage, toggle };
}

test('two binder invocations share one controller and one listener set', () => {
  const { document, storage } = createHarness();

  const first = bindThemeController({ document, storage });
  const second = bindThemeController({ document, storage });

  expect(second).toBe(first);
  expect(document[THEME_CONTROLLER_KEY]).toBe(first);
  expect(document.listenerCount('click')).toBe(1);
  expect(document.listenerCount('astro:page-load')).toBe(1);
  expect(document.listenerCount('astro:after-swap')).toBe(1);
});

test('returns a document-persistent controller before adding listeners', () => {
  const { document, storage } = createHarness();
  const existing = { sync() {}, toggle() {} };
  document[THEME_CONTROLLER_KEY] = existing;

  expect(bindThemeController({ document, storage })).toBe(existing);
  expect(document.listenerCount('click')).toBe(0);
  expect(document.listenerCount('astro:page-load')).toBe(0);
  expect(document.listenerCount('astro:after-swap')).toBe(0);
});

test('keeps the persistent guard and a single desktop landmark label', async () => {
  const [theme, toc] = await Promise.all([
    readSource('../../src/lib/theme-controller.mjs'),
    readSource('../../src/components/ReadingToc.astro'),
  ]);
  const desktopNav = toc.match(/<nav id="toc-desktop"[^>]*>/u)?.[0] ?? '';
  const desktopAside = toc.match(/<aside[\s\S]*?>/u)?.[0] ?? '';
  const mobileNav = toc.match(/<nav\s+class="toc-mobile-viewport[\s\S]*?>/u)?.[0] ?? '';

  expect(theme).toContain("Symbol.for('guidebook.theme-controller')");
  expect(theme).toMatch(/documentRef\[THEME_CONTROLLER_KEY\]/u);
  expect(desktopNav).not.toContain('aria-label');
  expect(desktopAside).toContain('aria-label={label}');
  expect(mobileNav).toContain('aria-label={mobileLandmarkLabel}');
  expect(toc).toContain('const mobileLandmarkLabel = `${label} list`;');
  expect(mobileNav).not.toContain('aria-label={label}');
  expect(toc).toContain('data-toc-link={h.id}');
});

test('templates ship no markup hook that no client script reads', async () => {
  const [layout, toc, disclosure, readingToc, routeLoader, theme] = await Promise.all([
    readSource('../../src/layouts/BaseLayout.astro'),
    readSource('../../src/components/ReadingToc.astro'),
    readSource('../../src/lib/disclosure-controller.mjs'),
    readSource('../../src/lib/reading-toc-controller.mjs'),
    readSource('../../src/lib/route-loader.mjs'),
    readSource('../../src/lib/theme-controller.mjs'),
  ]);
  const clientScripts = [disclosure, readingToc, routeLoader, theme].join('\n');

  expect(clientScripts).not.toContain('site-nav-overlay');
  expect(layout).not.toContain('site-nav-overlay');
  expect(clientScripts).not.toMatch(/\sdata-toc(?![-\w])/u);
  expect(toc).not.toMatch(/\sdata-toc(?![-\w])/u);
  for (const marker of ['data-toc-link', 'data-toc-mobile-current', 'data-toc-mobile']) {
    expect(toc).toContain(marker);
    expect(readingToc).toContain(`[${marker}]`);
  }
});

test('every table-of-contents anchor names its full heading text', async () => {
  const toc = await readSource('../../src/components/ReadingToc.astro');
  const anchors = [
    ...toc.matchAll(/<a\n(?:[^\n]*\n)*?[^\n]*data-toc-link=\{h\.id\}\n(?:[^\n]*\n)*?[^\n]*>/gu),
  ];

  expect(anchors).toHaveLength(2);
  for (const [anchor] of anchors) {
    expect(anchor).toContain('title={h.text}');
    expect(anchor).toContain('aria-label={h.text}');
  }
});

test('binds the disclosure controller once behind a durable document guard', async () => {
  const [disclosure, layout] = await Promise.all([
    readSource('../../src/lib/disclosure-controller.mjs'),
    readSource('../../src/layouts/BaseLayout.astro'),
  ]);

  expect(disclosure).toContain("Symbol.for('guidebook.disclosure-controller')");
  expect(disclosure).toMatch(/documentRef\[DISCLOSURE_CONTROLLER_KEY\]/u);
  expect(disclosure).toContain("'(prefers-reduced-motion: reduce)'");
  expect(disclosure).toContain("addEventListener?.('click'");
  expect(disclosure).toContain("addEventListener?.('transitionend'");
  expect(disclosure).toContain("addEventListener?.('astro:before-swap'");
  expect(layout).toContain("from '../lib/disclosure-controller.mjs'");
  expect(layout.match(/bindDisclosureController\(/gu)).toHaveLength(1);
});
