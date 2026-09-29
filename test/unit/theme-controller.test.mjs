import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import {
  bindThemeController,
  currentTheme,
  initializeTheme,
} from '../../src/lib/theme-controller.mjs';

const readSource = (relativePath) => readFile(new URL(relativePath, import.meta.url), 'utf8');

import {
  createHarness,
  createStorage,
  FakeElement,
  withLocalStorage,
} from '../fixtures/theme-controller.fixtures.mjs';

test('uses dark as the current and default theme', () => {
  const { root, storage } = createHarness();

  expect(currentTheme(root)).toBe('dark');

  initializeTheme(root, storage);

  expect(root.dataset.theme).toBe('dark');
});

test('falls back to dark when storage reads fail', () => {
  const { document, root, storage } = createHarness();
  storage.failGet = true;

  expect(() => bindThemeController({ document, storage })).not.toThrow();
  expect(root.dataset.theme).toBe('dark');
});

test('uses global localStorage when no storage dependency is supplied', () => {
  const fallbackStorage = createStorage({ theme: 'light' });
  withLocalStorage(fallbackStorage, () => {
    const { document, root } = createHarness();

    bindThemeController({ document });

    expect(root.dataset.theme).toBe('light');
    expect(fallbackStorage.calls).toEqual([['getItem', 'theme']]);

    document.dispatch('click', { target: document.querySelector('#theme-toggle') });

    expect(fallbackStorage.calls).toContainEqual(['setItem', 'theme', 'dark']);
  });
});

test('uses a stored light preference during initialization', () => {
  const { document, root, storage } = createHarness({ storedTheme: 'light' });

  bindThemeController({ document, storage });

  expect(root.dataset.theme).toBe('light');
});

test('toggles and persists the next theme successfully', () => {
  const { document, root, storage } = createHarness();

  bindThemeController({ document, storage });
  document.dispatch('click', { target: document.querySelector('#theme-toggle') });

  expect(root.dataset.theme).toBe('light');
  expect(storage.values.get('theme')).toBe('light');
  expect(storage.calls).toContainEqual(['setItem', 'theme', 'light']);
});

test('keeps controller-owned toggle state when persistence fails', () => {
  const { document, root, storage } = createHarness();
  storage.failSet = true;

  bindThemeController({ document, storage });
  document.dispatch('click', { target: document.querySelector('#theme-toggle') });
  root.dataset.theme = 'dark';
  document.dispatch('astro:after-swap');

  expect(root.dataset.theme).toBe('light');
});

test('restores the active theme after a same-root data-theme clobber', () => {
  const { document, root, storage } = createHarness({ storedTheme: 'light' });

  bindThemeController({ document, storage });
  root.dataset.theme = 'dark';
  document.dispatch('astro:after-swap');

  expect(root.dataset.theme).toBe('light');
});

test('handles clicks delegated to a replacement header button', () => {
  const { document, root, storage } = createHarness();
  bindThemeController({ document, storage });
  const replacement = new FakeElement({ id: 'theme-toggle' });
  const child = new FakeElement({ closest: replacement });

  document.dispatch('click', { target: child });

  expect(root.dataset.theme).toBe('light');
  expect(replacement.listeners.size).toBe(0);
});

test('synchronizes button accessibility state with the active theme', () => {
  const { document, root, storage, toggle } = createHarness({ storedTheme: 'light' });

  bindThemeController({ document, storage });

  expect(toggle.getAttribute('aria-label')).toBe('Switch to dark theme');

  document.dispatch('click', { target: document.querySelector('#theme-toggle') });
  root.dataset.theme = 'light';
  document.dispatch('astro:after-swap');

  expect(toggle.getAttribute('aria-label')).toBe('Switch to light theme');
});

test('does not make JavaScript icon visibility the source of truth', () => {
  const { darkIcon, document, lightIcon, storage } = createHarness();

  bindThemeController({ document, storage });
  document.dispatch('click', { target: document.querySelector('#theme-toggle') });
  document.dispatch('astro:after-swap');

  expect(darkIcon.getAttribute('hidden')).toBeNull();
  expect(lightIcon.getAttribute('hidden')).toBeNull();
  expect(darkIcon.getAttribute('class')).toBeNull();
  expect(lightIcon.getAttribute('class')).toBeNull();
});

test('ships CSS-driven icons and a dark-default accessible button', async () => {
  const [layout, css, controller] = await Promise.all([
    readSource('../../src/layouts/BaseLayout.astro'),
    readSource('../../src/styles/global.css'),
    readSource('../../src/lib/theme-controller.mjs'),
  ]);

  expect(layout).toContain('data-theme-icon="dark"');
  expect(layout).toContain('data-theme-icon="light"');
  expect(layout).not.toMatch(/data-theme-icon="light"[\s\S]{0,120}class="hidden"/u);
  expect(layout).toContain('aria-label="Switch to light theme"');
  expect(layout).toContain('class="theme-label hidden sm:inline"');
  expect(css).toMatch(/\[data-theme='dark'\]\s+\[data-theme-icon='light'\]/u);
  expect(css).toMatch(/\[data-theme='light'\]\s+\[data-theme-icon='dark'\]/u);
  expect(controller).not.toContain('resolveTheme');
  expect(controller).not.toContain('getCurrentTheme');
  expect(controller).not.toContain('classList');
  expect(controller).not.toContain('setIconHidden');
});

test('binds each document and root only once', () => {
  const { document, root, storage } = createHarness();

  const first = bindThemeController({ document, storage });
  const second = bindThemeController({ document, storage });

  expect(second).toBe(first);
  expect(document.listenerCount('click')).toBe(1);
  expect(document.listenerCount('astro:page-load')).toBe(1);
  expect(document.listenerCount('astro:after-swap')).toBe(1);

  document.dispatch('click', { target: document.querySelector('#theme-toggle') });

  expect(root.dataset.theme).toBe('light');
});
