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

  /* Two rendered lists: the desktop nav and the mobile nav. */
  expect(anchors).toHaveLength(2);
  for (const [anchor] of anchors) {
    /*
     * `aria-label` is gone. The label duplicated the visible text, so the
     * accessible name could drift from what the reader sees, and the ordinal
     * span in front of it was still announced as part of the destination's
     * name. The heading text is now the only name source.
     */
    expect(anchor).not.toContain('aria-label');
  }

  /* Only the desktop label truncates, so only it needs the tooltip. */
  const [desktop, mobile] = anchors.map(([anchor]) => anchor);

  expect(desktop).toContain('data-toc-link={h.id}');
  expect(mobile).toContain('data-toc-link={h.id}');
  expect(desktop).toContain('title={h.text}');
  expect(desktop).not.toContain('aria-label');
  expect(mobile).not.toContain('aria-label');
  expect(toc).toContain('<span class="min-w-0 flex-1 truncate">{h.text}</span>');
  expect(toc).toContain('<span class="min-w-0 flex-1">{h.text}</span>');

  const ordinals = [...toc.matchAll(/<span class=\{tocNumClass\}[^>]*>([\s\S]*?)<\/span>/gu)];
  const labels = [...toc.matchAll(/<span class="min-w-0[^"]*">\{h\.text\}<\/span>/gu)];

  expect(ordinals).toHaveLength(2);
  for (const [ordinal] of ordinals) {
    expect(ordinal).toContain('aria-hidden="true"');
  }
  expect(labels).toHaveLength(2);
  for (const [label] of labels) {
    expect(label).not.toContain('aria-hidden');
  }
  expect(toc).not.toContain('aria-label={h.text}');
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

test('the contributions list is named by its section, not a colliding landmark', async () => {
  const [home, layout] = await Promise.all([
    readSource('../../src/components/HomeTitleBlock.astro'),
    readSource('../../src/layouts/BaseLayout.astro'),
  ]);
  const section =
    home.match(/<section[^>]*aria-labelledby="contributions-heading"[^>]*>/u)?.[0] ?? '';
  const list = home.match(/<ol\b[^>]*>/u)?.[0] ?? '';
  const ordinals = [...home.matchAll(/<span class="font-mono[^"]*" aria-hidden="true">/gu)];

  /*
   * The `<ol>` used to carry `aria-label="Book sections"`, the same string the
   * header nav landmark uses. Two landmarks on one page with an identical
   * accessible name is a landmark-uniqueness violation, and it is exactly the
   * ambiguity a screen-reader user hits when jumping between them.
   */
  expect(section).toBeDefined();
  expect(section).toContain('aria-labelledby="contributions-heading"');
  expect(home).toContain('id="contributions-heading"');
  expect(list).not.toContain('aria-label');
  expect(home).not.toContain('aria-label="Book sections"');
  expect(home).not.toContain('aria-labelledby="contributions-heading" class="list-none');

  /* The header nav is the one remaining "Book sections" landmark. */
  expect(layout).toContain('aria-label="Book sections"');
  expect(layout.match(/aria-label="Book sections"/gu)).toHaveLength(1);

  expect(ordinals).toHaveLength(1);
  expect(ordinals[0][0]).toContain('aria-hidden="true"');
});

test('the site-nav section ordinal is decorative and the skip link is focus-visible', async () => {
  const layout = await readSource('../../src/layouts/BaseLayout.astro');
  const skipLink = layout.match(/<a\s+href="#main"[\s\S]*?>/u)?.[0] ?? '';
  const summary = layout.match(/<summary[\s\S]*?<\/summary>/u)?.[0] ?? '';

  /* The `Section NN / NN` counter is decorative; the button's accessible name
   * must not change with viewport width (WCAG 2.5.3). */
  expect(summary).toContain('aria-hidden="true"');
  expect(summary).toContain('Contents');

  /* `focus-visible` rather than `focus`, and `fixed` rather than `absolute`, so
   * the skip link stays reachable after the reader has scrolled. */
  expect(skipLink).toContain('sr-only');
  expect(skipLink).toContain('focus-visible:not-sr-only');
  expect(skipLink).toContain('focus-visible:fixed');
  expect(skipLink).toContain('focus-visible:top-2');
  expect(skipLink).toContain('focus-visible:left-2');
  expect(skipLink).toContain('focus-visible:z-50');
  expect(skipLink).not.toMatch(/(?<!visible:)(?:^|\s)focus:/u);
  expect(skipLink).not.toContain('focus:absolute');
});

test('a noindex page emits the robots meta and a normal page does not', async () => {
  const [layout, notFound] = await Promise.all([
    readSource('../../src/layouts/BaseLayout.astro'),
    readSource('../../src/pages/404.astro'),
  ]);

  expect(layout).toContain('<meta name="robots" content="noindex, follow" />');
  expect(layout).toContain('noindex?: boolean;');
  expect(layout).toContain('noindex = false');
  /*
   * Formatting-independent: Prettier collapses the opening tag onto one line,
   * so a line-anchored regex for a bare `noindex` attribute is brittle. Assert
   * the attribute is passed to `BaseLayout` wherever it lands in the tag.
   */
  expect(notFound).toMatch(/<BaseLayout\b[^>]*\bnoindex\b[^>]*>/su);
});

/*
 * The route-loader unit spec cannot catch a wiring regression: its fake
 * document hard-codes the answer for every selector the controller asks for, so
 * renaming an attribute in the layout or the controller still passes. These
 * assertions close that gap by checking the two halves against each other.
 */
test('every route-loader querySelector resolves against a shipped template', async () => {
  const [controller, layout, page, notFound] = await Promise.all([
    readSource('../../src/lib/route-loader.mjs'),
    readSource('../../src/layouts/BaseLayout.astro'),
    readSource('../../src/pages/[...slug].astro'),
    readSource('../../src/pages/404.astro'),
  ]);
  const templates = [layout, page, notFound].join('\n');
  const selectors = [
    ...new Set(
      [...controller.matchAll(/querySelector\?\.\('([^']+)'\)/gu)].map(([, selector]) => selector),
    ),
  ];

  expect(selectors.toSorted()).toEqual([
    '#route-loader',
    '[data-route-loader-message]',
    '[data-route-loader]',
    'main',
    'main#main',
  ]);

  const anchors = {
    'main#main': 'id="main"',
    main: '<main',
    '[data-route-loader]': 'data-route-loader',
    '#route-loader': 'id="route-loader"',
    '[data-route-loader-message]': 'data-route-loader-message',
  };

  for (const selector of selectors) {
    /* Both halves of every `a ?? b` pair must exist somewhere; a single rename
     * of the preferred half still resolves through its fallback. */
    for (const half of selector.split(',').map((part) => part.trim())) {
      expect(templates).toContain(anchors[half]);
    }
  }

  /* `<main>` carries the id the controller prefers. */
  expect(page).toMatch(/<main\b[\s\S]{0,200}id="main"/u);
});

test('the loader attribute the controller writes is the one the layout reveals on', async () => {
  const [controller, layout] = await Promise.all([
    readSource('../../src/lib/route-loader.mjs'),
    readSource('../../src/layouts/BaseLayout.astro'),
  ]);
  const loader = layout.match(/<div\s+id="route-loader"[\s\S]*?>/u)?.[0] ?? '';

  /* The utility is an attribute selector, so a JS-only write can never reveal
   * the skeleton even when the state machine is correct. */
  expect(controller).toContain(`setAttribute?.('data-visible'`);
  expect(loader).toContain('data-visible="false"');
  expect(loader).toContain('data-[visible=true]:opacity-100');
  expect(loader).toContain('transition-opacity');
  expect(loader).toContain('opacity-0');
  /* The skeleton is decorative; a viewport-wide click blocker over the content
   * mid-navigation is worse than the missing feedback. */
  expect(loader).toContain('pointer-events-none');
});
