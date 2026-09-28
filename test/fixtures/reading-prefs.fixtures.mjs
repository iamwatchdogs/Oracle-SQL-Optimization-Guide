/*
 * Doubles for `reading-prefs-controller`.
 *
 * `theme-controller.fixtures.mjs` cannot be reused as-is: its `FakeElement`
 * special-cases `data-theme` and `data-theme-icon` in `getAttribute`, which is
 * how the theme controller's attribute reads became observable. The reading
 * controller reads three different attributes and `dataset.value` /
 * `dataset.readingPref` off the controls it syncs, so this fake models all of
 * that generically — a data attribute round-trips through `dataset` by
 * construction, which is what a real element does.
 */

/*
 * The step lists are imported, not retyped.
 *
 * They were literals here — `['62', '68', '74']` — and when the steps were
 * re-rounded to 60 / 70 / 75 the harness went on presenting controls for three
 * measures the product no longer offers, so every test that pressed one asserted
 * against a vocabulary that had been deleted. A fixture that retypes the thing it
 * stands in for is a fixture that can disagree with it silently.
 */
import { MEASURE_STEPS, TEXT_SCALE_STEPS } from '../../src/lib/reading-prefs-store.mjs';

export function createPreferenceStorage(initial = {}) {
  const storage = {
    values: new Map(Object.entries(initial)),
    calls: [],
    failGet: false,
    failSet: false,
  };

  storage.getItem = (key) => {
    storage.calls.push(['getItem', key]);
    if (storage.failGet) {
      throw new Error('storage unavailable');
    }
    return storage.values.get(key) ?? null;
  };

  storage.setItem = (key, value) => {
    storage.calls.push(['setItem', key, value]);
    if (storage.failSet) {
      throw new Error('storage unavailable');
    }
    storage.values.set(key, value);
  };

  storage.removeItem = (key) => {
    storage.calls.push(['removeItem', key]);
    storage.values.delete(key);
  };

  return storage;
}

const CLOSEST_MATCHERS = {
  '[data-toc-rail-toggle]': (node) => node.classes.has('rail-toggle'),
  '[data-reading-pref]': (node) => node.classes.has('pref'),
  'header summary': (node) => node.tag === 'summary',
  details: (node) => node.tag === 'details',
};

/* Recursive rather than iterative: a `let cursor = this` loop trips
   `unicorn/no-this-assignment`, and this walks parent chains four deep. */
const walkUp = (selector, node) => {
  if (!node) {
    return null;
  }
  if (node.tag === selector || CLOSEST_MATCHERS[selector]?.(node)) {
    return node;
  }
  return walkUp(selector, node.parent);
};

const toCamel = (name) =>
  name.replace(/^data-/u, '').replaceAll(/-(\w)/gu, (_, character) => character.toUpperCase());

export class FakePreferenceElement {
  /*
   * An explicit `constructor` rather than a class-header parameter list: the
   * rolldown version this repo's `vitest` runs on cannot parse the latter at all,
   * failing with `Expected "{" but found "("` at the class name. The project's
   * other fixtures already write it this way for the same reason.
   */
  constructor({ id = '', classes = [], dataset = {}, attributes = {}, tag = 'div' } = {}) {
    this.id = id;
    this.tag = tag;
    this.classes = new Set(classes);
    this.dataset = { ...dataset };
    for (const [name, value] of Object.entries(attributes)) {
      this.setAttribute(name, value);
    }
    this.open = false;
    this.listeners = new Map();
    this.parent = null;
    this.children = [];
    this.railToggles = [];
    this.textControls = [];
    this.measureControls = [];
    this.headerDetails = [];
  }

  /*
   * `dataset` is the single source of truth, exactly as on a real element: a
   * data attribute and its camelCase dataset key are one thing, not two that
   * have to be kept in step. The `attributes` Map is therefore a derived view,
   * so a test can still ask `has()`.
   */
  get attributes() {
    return new Map(
      Object.entries(this.dataset).map(([key, value]) => [
        `data-${key.replaceAll(/[A-Z]/gu, (c) => `-${c.toLowerCase()}`)}`,
        value,
      ]),
    );
  }

  getAttribute(name) {
    return this.dataset[toCamel(name)] ?? null;
  }

  setAttribute(name, value) {
    this.dataset[toCamel(name)] = String(value);
  }

  removeAttribute(name) {
    delete this.dataset[toCamel(name)];
  }

  addEventListener(type, handler) {
    const bucket = this.listeners.get(type) ?? [];
    bucket.push(handler);
    this.listeners.set(type, bucket);
  }

  removeEventListener() {}

  dispatch(type, event = {}) {
    for (const handler of this.listeners.get(type) ?? []) {
      handler(event);
    }
  }

  /** Walk up from this element until a `closest()` answer is found. */
  closest(selector) {
    return walkUp(selector, this);
  }

  querySelectorAll(selector) {
    const pool = {
      '[data-toc-rail-toggle]': this.railToggles,
      '[data-reading-pref="text"]': this.textControls,
      '[data-reading-pref="measure"]': this.measureControls,
      'header details[open]': this.headerDetails.filter((details) => details.open),
    };
    return pool[selector] ?? [];
  }

  querySelector(selector) {
    return this.selectors?.[selector] ?? null;
  }

  /** Wire a parent, the way a real DOM tree is built. */
  append(child) {
    child.parent = this;
    this.children.push(child);
    return child;
  }
}

export function preferenceControl(value, { kind = 'text' } = {}) {
  const node = new FakePreferenceElement({ tag: 'button', classes: ['pref'] });
  node.dataset.readingPref = kind;
  node.dataset.value = value;
  node.dataset.ariaPressed = 'false';
  return node;
}

export function railToggleControl() {
  return new FakePreferenceElement({ tag: 'button', classes: ['rail-toggle'] });
}

export function createPreferencesHarness({ stored = {} } = {}) {
  const storage = createPreferenceStorage(stored);
  const root = new FakePreferenceElement({ tag: 'html' });
  const document = new FakePreferenceElement({ tag: 'document' });
  const siteNav = new FakePreferenceElement({ tag: 'details', id: 'site-nav' });
  const readingPrefs = new FakePreferenceElement({ tag: 'details', id: 'reading-prefs' });

  document.documentElement = root;
  document.railToggles = [railToggleControl(), railToggleControl()];
  document.textControls = TEXT_SCALE_STEPS.map((value) => preferenceControl(value));
  document.measureControls = MEASURE_STEPS.map((value) =>
    preferenceControl(value, { kind: 'measure' }),
  );
  document.headerDetails = [siteNav, readingPrefs];

  return {
    document,
    root,
    storage,
    siteNav,
    readingPrefs,
    click: (target) => document.dispatch('click', { target }),
  };
}
