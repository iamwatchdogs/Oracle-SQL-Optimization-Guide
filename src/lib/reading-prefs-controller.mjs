/*
 * Reader preferences: text scale, line measure, TOC rail state. One controller,
 * one attribute each on `<html>` — `data-reading-text` is the `--type-scale`
 * multiplier, `data-reading-measure` is the measure in characters and the track
 * it sits in, `data-reading-toc` is `collapsed` while the margin rail is shut.
 *
 * The pattern is `theme-controller.mjs`, and for the same reason: the router
 * replaces the whole document on a client navigation, which replaces `<html>` and
 * takes every attribute on it along. So the inline bootstrap in
 * `BaseLayout.astro` writes the attributes before first paint, and this controller
 * re-writes them on `astro:after-swap` for every navigation after. Storage is the
 * source of truth and `reading-prefs-store.mjs` owns the vocabulary; this half
 * owns the document.
 */

import {
  COLLAPSED_TOC,
  commitPreference,
  isPreference,
  normalizePreference,
  projectPreferenceState,
  readPreferenceState,
} from './reading-prefs-store.mjs';

export {
  COLLAPSED_TOC,
  DEFAULT_MEASURE,
  DEFAULT_TEXT_SCALE,
  MEASURE_STORAGE_KEY,
  MEASURE_STEPS,
  TEXT_SCALE_STORAGE_KEY,
  TEXT_SCALE_STEPS,
  TOC_STORAGE_KEY,
} from './reading-prefs-store.mjs';

const READING_PREFS_CONTROLLER_KEY = Symbol.for('guidebook.reading-prefs-controller');
const bindings = new WeakMap();

function eachControl(documentRef, selector) {
  return documentRef?.querySelectorAll?.(selector) ?? [];
}

function pressState(documentRef, selector, attribute, isActive) {
  for (const control of eachControl(documentRef, selector)) {
    const next = String(isActive(control));
    /* Same reason as `applyAttribute`: nine aria writes a navigation for values
       that are already correct is nine attribute mutations to process. */
    // oxlint-disable-next-line unicorn/prefer-dom-node-dataset -- see setLoaderVisibility in route-loader.mjs
    if (control.getAttribute?.(attribute) !== next) {
      // oxlint-disable-next-line unicorn/prefer-dom-node-dataset -- see setLoaderVisibility in route-loader.mjs
      control.setAttribute?.(attribute, next);
    }
  }
}

/*
 * One open header disclosure at a time.
 *
 * The header carries two `<details>`: the section list and the reading
 * preferences. Left alone they stack — on a phone both panels are in flow, so
 * opening one and then the other produced a 1200px header over an 844px viewport.
 * Closing the other on open is the rule the reading surface already follows for
 * the mobile TOC: a jump dismisses what it jumped past.
 */
function closeSiblingDisclosures(documentRef, opening) {
  for (const details of eachControl(documentRef, 'header details[open]')) {
    if (details !== opening) {
      details.open = false;
    }
  }
}

function clickTarget(event) {
  const target = event?.target;
  return typeof target?.closest === 'function' ? target : null;
}

function createHandlers({ documentRef, state, set }) {
  const onClick = (event) => {
    const target = clickTarget(event);
    if (!target) {
      return;
    }

    if (target.closest('[data-toc-rail-toggle]')) {
      set('toc', state.toc === COLLAPSED_TOC ? '' : COLLAPSED_TOC);
      return;
    }

    const control = target.closest('[data-reading-pref]');
    const key = control?.dataset?.readingPref;
    if (!isPreference(key)) {
      return;
    }
    /* A click that lands on the value already in force is a no-op, not a reset.
       Double-clicking a step must not toggle the reading size. */
    if (normalizePreference(key, control.dataset.value) !== state[key]) {
      set(key, control.dataset.value);
    }
  };

  const onHeaderClick = (event) => {
    const details = clickTarget(event)?.closest('header summary')?.closest('details');
    if (details && !details.open) {
      closeSiblingDisclosures(documentRef, details);
    }
  };

  return { onClick, onHeaderClick };
}

function createSyncer(root, documentRef, state) {
  return () => {
    for (const key of ['text', 'measure', 'toc']) {
      projectPreferenceState(root, state, key);
    }
    for (const key of ['text', 'measure']) {
      const isActive = (control) => control.dataset.value === state[key];
      pressState(documentRef, `[data-reading-pref="${key}"]`, 'aria-pressed', isActive);
    }
    const railIsOpen = () => state.toc !== COLLAPSED_TOC;
    pressState(documentRef, '[data-toc-rail-toggle]', 'aria-expanded', railIsOpen);
  };
}

function createController(root, documentRef, storage, state) {
  const sync = createSyncer(root, documentRef, state);
  /* One entry point, so the DOM can never be left describing a different
     preference than the one that was just written. */
  const set = (key, value) => {
    const next = commitPreference(root, storage, state, key, value);
    sync();
    return next;
  };

  return {
    sync,
    set,
    toggleRail() {
      return set('toc', state.toc === COLLAPSED_TOC ? '' : COLLAPSED_TOC);
    },
    get state() {
      return { ...state };
    },
  };
}

export function createReadingPrefsController(dependencies = {}) {
  const documentRef = dependencies.document;
  const storage = dependencies.storage;
  const root = documentRef?.documentElement;
  const state = readPreferenceState(root, storage);
  const controller = createController(root, documentRef, storage, state);
  const { onClick, onHeaderClick } = createHandlers({ documentRef, state, set: controller.set });

  documentRef?.addEventListener?.('click', onClick);
  documentRef?.addEventListener?.('click', onHeaderClick, true);
  /*
   * `astro:after-swap` and NOT `astro:page-load` as well.
   *
   * `swapRootAttributes` in Astro's swap functions removes every attribute from
   * the live `<html>` and copies the incoming document's over it, and the head
   * bootstrap does not re-run: Astro's `deselectScripts` marks an already-executed
   * inline script with `data-astro-exec`, so the same text never runs twice. So
   * after every client navigation the reader's three `data-reading-*` attributes
   * are gone and have to be written back. `after-swap` is the first event after
   * that wipe and still lands before the new content is composited.
   *
   * `astro:page-load` used to be wired to the same `sync` as well, which made
   * every navigation project the state twice — 3 attribute writes plus 9 aria
   * writes, all of them re-asserting values that were already correct a
   * millisecond earlier.
   */
  documentRef?.addEventListener?.('astro:after-swap', controller.sync);

  return controller;
}

/*
 * Two guards, one lookup. The symbol on the `document` survives a navigation —
 * the router swaps the body's contents but the document object is the same — and
 * the per-root `WeakMap` stops two roots sharing one document from fighting over
 * it. `stashOnDocument` tolerates a document that refuses expando properties: that
 * reader still gets a working controller, minus one guard.
 */
function stashOnDocument(documentRef, controller) {
  try {
    documentRef[READING_PREFS_CONTROLLER_KEY] = controller;
  } catch {
    /* ignored on purpose; see above */
  }
  return controller;
}

function perRootBindings(documentRef) {
  let perRoot = bindings.get(documentRef);
  if (!perRoot) {
    perRoot = new WeakMap();
    bindings.set(documentRef, perRoot);
  }
  return perRoot;
}

export function bindReadingPrefs(dependencies = {}) {
  const isDocument = typeof dependencies?.querySelector === 'function';
  const documentRef = isDocument ? dependencies : (dependencies.document ?? globalThis.document);
  const root = documentRef?.documentElement;
  if (!root) {
    return { sync() {}, set() {}, toggleRail() {}, state: {} };
  }

  const perRoot = perRootBindings(documentRef);
  const existing = documentRef?.[READING_PREFS_CONTROLLER_KEY] ?? perRoot.get(root);
  if (existing) {
    return stashOnDocument(documentRef, existing);
  }

  const controller = createReadingPrefsController({
    document: documentRef,
    storage: isDocument ? dependencies.storage : undefined,
  });
  perRoot.set(root, controller);
  controller.sync();
  return stashOnDocument(documentRef, controller);
}
