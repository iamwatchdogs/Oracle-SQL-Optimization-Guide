import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import {
  bindReadingPrefs,
  createReadingPrefsController,
  DEFAULT_MEASURE,
  DEFAULT_TEXT_SCALE,
  MEASURE_STEPS,
  TOC_STORAGE_KEY,
} from '../../src/lib/reading-prefs-controller.mjs';
import { COLLAPSED_TOC } from '../../src/lib/reading-prefs-store.mjs';

import {
  createPreferencesHarness,
  FakePreferenceElement,
} from '../fixtures/reading-prefs.fixtures.mjs';

const readSource = (relativePath) => readFile(new URL(relativePath, import.meta.url), 'utf8');

const bind = (harness) => {
  const controller = createReadingPrefsController({
    document: harness.document,
    storage: harness.storage,
  });
  controller.sync();
  return controller;
};

test('every step the stylesheet ships is a step the controller validates', async () => {
  const css = await readSource('../../src/styles/global.css');
  const markup = await readSource('../../src/layouts/BaseLayout.astro');

  /* The buttons are written from the lists, so the markup cannot enumerate a
     step the controller would then reject. */
  expect(markup).toContain('data-value={scale}');
  expect(markup).toContain('data-value={measure}');
  for (const step of MEASURE_STEPS) {
    expect(css).toContain(`--measure: ${step}ch`);
  }
  expect(css).toContain(`--width-reading-track: 46rem`);
});

test('a reader who has touched nothing carries no attribute at all', () => {
  const harness = createPreferencesHarness();

  bind(harness);

  /* The default is the ABSENCE of the attribute, not the default value: it keeps
     the stylesheet a single `:root` block with no override in play, and it makes
     "back to default" a real state rather than a fourth step. */
  expect(harness.root.attributes.has('data-reading-text')).toBe(false);
  expect(harness.root.attributes.has('data-reading-measure')).toBe(false);
  expect(harness.root.attributes.has('data-reading-toc')).toBe(false);
});

test('writes the attribute before storage, and a failed write never reverts it', () => {
  const harness = createPreferencesHarness();
  const order = [];
  const original = harness.storage.setItem;
  harness.storage.setItem = (key, value) => {
    order.push(`setItem:${harness.root.attributes.has('data-reading-text')}`);
    return original(key, value);
  };
  const controller = bind(harness);

  controller.set('text', '1.2');
  expect(order).toEqual(['setItem:true']);

  harness.storage.failSet = true;
  expect(() => controller.set('text', '1.1')).not.toThrow();
  expect(harness.root.dataset.readingText).toBe('1.1');
});

test('rejects a value no rule in the stylesheet can honour', () => {
  const harness = createPreferencesHarness();
  const controller = bind(harness);

  expect(controller.set('text', '3')).toBe(DEFAULT_TEXT_SCALE);
  expect(harness.root.attributes.has('data-reading-text')).toBe(false);

  expect(controller.set('measure', '999')).toBe(DEFAULT_MEASURE);
  expect(harness.root.attributes.has('data-reading-measure')).toBe(false);
});

test('a stale stored key falls through to the default instead of breaking the page', () => {
  const harness = createPreferencesHarness({
    stored: { 'reading-text': '1.4', 'reading-measure': '40' },
  });

  bind(harness);

  expect(harness.root.attributes.has('data-reading-text')).toBe(false);
  expect(harness.root.attributes.has('data-reading-measure')).toBe(false);
});

test('reads a valid stored preference on bind, the way the inline bootstrap wrote it', () => {
  const harness = createPreferencesHarness({
    stored: {
      'reading-text': '1.1',
      'reading-measure': '75',
      [TOC_STORAGE_KEY]: COLLAPSED_TOC,
    },
  });

  bind(harness);

  expect(harness.root.dataset.readingText).toBe('1.1');
  expect(harness.root.dataset.readingMeasure).toBe('75');
  expect(harness.root.dataset.readingToc).toBe(COLLAPSED_TOC);
});

test('marks the active step pressed and every other step unpressed', () => {
  const harness = createPreferencesHarness();
  const controller = bind(harness);

  controller.set('measure', '75');

  const pressed = harness.document.measureControls.map(
    (node) => `${node.dataset.value}=${node.getAttribute('aria-pressed')}`,
  );
  expect(pressed).toEqual(['60=false', '70=false', '75=true']);
});

test('re-asserts every attribute on page load, because the router replaced the document', () => {
  const harness = createPreferencesHarness();
  const controller = bind(harness);
  controller.set('text', '0.9');

  /* The whole point of the router hook: a client navigation swaps in a fresh
     `<html>` with none of the attributes on it. */
  delete harness.root.dataset.readingText;
  harness.document.dispatch('astro:after-swap');

  expect(harness.root.dataset.readingText).toBe('0.9');
});

/*
 * Once per navigation, on `after-swap` and not on `page-load` as well.
 *
 * `page-load` used to be wired to the same `sync`, which meant every client
 * navigation re-projected the state twice: three attribute writes and nine aria
 * writes, every one of them re-asserting a value the pass a moment earlier had
 * already put there. `after-swap` is the first event after
 * `swapRootAttributes` wipes `<html>` and still lands before the new content is
 * composited, so it is the only one that has to be wired.
 */
test('re-asserts once per navigation, on after-swap only', () => {
  const harness = createPreferencesHarness();
  const controller = bind(harness);
  controller.set('measure', '60');

  delete harness.root.dataset.readingMeasure;
  harness.document.dispatch('astro:page-load');
  /* `page-load` is deliberately not wired: it fires after `after-swap` has
     already restored the state, so wiring it was a second identical pass. */
  expect(harness.root.dataset.readingMeasure).toBeUndefined();

  delete harness.root.dataset.readingMeasure;
  harness.document.dispatch('astro:after-swap');
  expect(harness.root.dataset.readingMeasure).toBe('60');
});

test('does not re-write an attribute that already says the right thing', () => {
  const harness = createPreferencesHarness();
  const controller = bind(harness);
  controller.set('measure', '75');

  let writes = 0;
  const realSetAttribute = harness.root.setAttribute.bind(harness.root);
  harness.root.setAttribute = (name, value) => {
    writes += 1;
    realSetAttribute(name, value);
  };

  controller.sync();

  /* The reader's three buttons and the two rail toggles are all already
     correct, so a second pass must not touch them. */
  expect(writes).toBe(0);
});

test('a click on the value already in force changes nothing', () => {
  const harness = createPreferencesHarness();
  bind(harness);
  const target = harness.document.textControls[1];

  harness.click(target);

  /* Double-clicking a step must not toggle the reading size. */
  expect(harness.storage.calls.filter(([call]) => call === 'setItem')).toHaveLength(0);
  expect(harness.root.attributes.has('data-reading-text')).toBe(false);
});

test('a click on a step writes it and marks it', () => {
  const harness = createPreferencesHarness();
  bind(harness);

  harness.click(harness.document.textControls[3]);

  expect(harness.root.dataset.readingText).toBe('1.2');
  expect(harness.storage.calls).toContainEqual(['setItem', 'reading-text', '1.2']);
});

test('either rail control toggles the same state, and both report it', () => {
  const harness = createPreferencesHarness();
  const controller = bind(harness);

  harness.click(harness.document.railToggles[0]);
  expect(harness.root.dataset.readingToc).toBe(COLLAPSED_TOC);
  expect(harness.document.railToggles.map((n) => n.getAttribute('aria-expanded'))).toEqual([
    'false',
    'false',
  ]);

  /* The edge tab is the only control left once the rail is gone, so it has to be
     able to bring it back — the rail is not its own undo. */
  harness.click(harness.document.railToggles[1]);
  expect(harness.root.attributes.has('data-reading-toc')).toBe(false);
  expect(harness.document.railToggles.map((n) => n.getAttribute('aria-expanded'))).toEqual([
    'true',
    'true',
  ]);
  expect(controller.state.toc).toBe('');
});

test('opening one header disclosure closes the other', () => {
  const harness = createPreferencesHarness();
  const { readingPrefs, siteNav } = harness;
  siteNav.open = true;
  bind(harness);

  const summary = new FakePreferenceElement({ tag: 'summary' });
  readingPrefs.append(summary);
  harness.click(summary);

  /* Two in-flow panels on a phone is a 1200px header over an 844px viewport. */
  expect(siteNav.open).toBe(false);
});

test('a storage read that throws still binds, on defaults', () => {
  const harness = createPreferencesHarness();
  harness.storage.failGet = true;

  expect(() => bind(harness)).not.toThrow();
  expect(harness.root.attributes.size).toBe(0);
});

test('binds once per document and per root', () => {
  const harness = createPreferencesHarness();

  const first = bindReadingPrefs({ document: harness.document, storage: harness.storage });
  const second = bindReadingPrefs({ document: harness.document, storage: harness.storage });

  expect(second).toBe(first);
  expect(harness.document.listeners.get('click')).toHaveLength(2);
});

test('binds nothing without a documentElement, rather than throwing', () => {
  const controller = bindReadingPrefs({ document: { documentElement: null } });

  expect(() => controller.sync()).not.toThrow();
  expect(controller.state).toEqual({});
});
