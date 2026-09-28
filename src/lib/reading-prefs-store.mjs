/*
 * The vocabulary of the reading preferences: what the three choices are, where
 * each one is stored, which attribute projects it onto `<html>`, and which
 * values are legal.
 *
 * Split out from `reading-prefs-controller.mjs` because this half has no opinion
 * about the document. It is the same shape as the theme controller's storage
 * half, and it is the half a stylesheet has to agree with: every step listed
 * here needs a rule in `global.css`, and a value that is not listed here can
 * never reach the DOM at all.
 *
 * Every default is the ABSENCE of its attribute rather than the default value.
 * A reader who never touched a control therefore has no `data-*` on `<html>`,
 * the stylesheet stays a single `:root` block with no override in play, and
 * "back to default" is a real state rather than a fourth step.
 */

export const TEXT_SCALE_STORAGE_KEY = 'reading-text';
export const MEASURE_STORAGE_KEY = 'reading-measure';
export const TOC_STORAGE_KEY = 'reading-toc';

export const DEFAULT_TEXT_SCALE = '1';
export const DEFAULT_MEASURE = '70';
export const COLLAPSED_TOC = 'collapsed';

/* Order is the order the controls present, smallest first. */
export const TEXT_SCALE_STEPS = ['0.9', '1', '1.1', '1.2'];
export const MEASURE_STEPS = ['60', '70', '75'];

/* `[key, storage key, steps, attribute, default]`. */
const PREFERENCE_TABLE = [
  ['text', TEXT_SCALE_STORAGE_KEY, TEXT_SCALE_STEPS, 'data-reading-text', DEFAULT_TEXT_SCALE],
  ['measure', MEASURE_STORAGE_KEY, MEASURE_STEPS, 'data-reading-measure', DEFAULT_MEASURE],
  ['toc', TOC_STORAGE_KEY, [COLLAPSED_TOC], 'data-reading-toc', ''],
];

const PREFERENCE_KEYS = Object.fromEntries(
  PREFERENCE_TABLE.map(([key, storage, steps, attribute, fallback]) => [
    key,
    { storage, steps, attribute, fallback },
  ]),
);

const PREFERENCE_NAMES = new Set(['text', 'measure', 'toc']);

export function isPreference(key) {
  return PREFERENCE_NAMES.has(key);
}

/** A value the stylesheet has a rule for, or `null`. */
export function normalizePreference(key, value) {
  const preference = PREFERENCE_KEYS[key];
  if (!preference) {
    return null;
  }
  const candidate = value === undefined || value === null ? '' : String(value);
  return preference.steps.includes(candidate) ? candidate : null;
}

function getStorage(storage) {
  if (storage !== undefined) {
    return storage;
  }
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function readStored(storage, key) {
  try {
    return normalizePreference(key, getStorage(storage)?.getItem?.(PREFERENCE_KEYS[key].storage));
  } catch {
    return null;
  }
}

function persist(storage, key, value) {
  const { storage: name } = PREFERENCE_KEYS[key];
  try {
    const target = getStorage(storage);
    if (value === PREFERENCE_KEYS[key].fallback) {
      target?.removeItem?.(name);
    } else {
      target?.setItem?.(name, value);
    }
  } catch {
    /* A reader who cannot write storage still gets the setting for this page. */
  }
}

/*
 * Skip the write when the attribute already says this.
 *
 * An attribute write on `<html>` is a style invalidation on the whole document
 * whether or not it changes anything, and the inline bootstrap has already put
 * every one of these three attributes in place before first paint. So on a cold
 * load the controller's first `sync` re-asserted three values that were already
 * correct, and on every client navigation it re-asserted the aria state of seven
 * buttons that the previous `sync` had just written.
 */
function applyAttribute(root, key, value) {
  const preference = PREFERENCE_KEYS[key];
  if (!root?.setAttribute) {
    return;
  }
  if (value === preference.fallback) {
    if (root.getAttribute?.(preference.attribute) !== null) {
      root.removeAttribute(preference.attribute);
    }
    return;
  }
  if (root.getAttribute?.(preference.attribute) !== value) {
    root.setAttribute(preference.attribute, value);
  }
}

function readAttribute(root, key) {
  return normalizePreference(key, root?.getAttribute?.(PREFERENCE_KEYS[key].attribute));
}

function readOne(root, storage, key) {
  return readStored(storage, key) ?? readAttribute(root, key) ?? PREFERENCE_KEYS[key].fallback;
}

export function readPreferenceState(root, storage) {
  return {
    text: readOne(root, storage, 'text'),
    measure: readOne(root, storage, 'measure'),
    toc: readOne(root, storage, 'toc'),
  };
}

/**
 * Write one preference, DOM first and storage second.
 *
 * A failed write never reverts the attribute: a reader blocked from storage
 * still gets the setting for this page, which is strictly better than a button
 * that appears to do nothing.
 */
export function commitPreference(root, storage, state, key, value) {
  if (!isPreference(key)) {
    return null;
  }
  const next = normalizePreference(key, value) ?? PREFERENCE_KEYS[key].fallback;
  state[key] = next;
  applyAttribute(root, key, next);
  persist(storage, key, next);
  return next;
}

export function projectPreferenceState(root, state, key) {
  applyAttribute(root, key, state[key]);
}
