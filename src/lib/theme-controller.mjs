export const DEFAULT_THEME = 'dark';
export const LIGHT_THEME = 'light';
export const THEME_STORAGE_KEY = 'theme';

const THEME_CONTROLLER_KEY = Symbol.for('guidebook.theme-controller');
const bindings = new WeakMap();

function normalizeTheme(value) {
  return value === LIGHT_THEME ? LIGHT_THEME : DEFAULT_THEME;
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

function readStoredTheme(storage) {
  try {
    return storage?.getItem?.(THEME_STORAGE_KEY) === LIGHT_THEME ? LIGHT_THEME : null;
  } catch {
    return null;
  }
}

/*
 * Both writes below are compared before they happen, which is what
 * `applyAttribute` in `reading-prefs-store.mjs` does for the same reason.
 *
 * `data-theme` is not a cheap attribute to touch. `[data-theme='light']`
 * redefines 24 custom properties for the whole document — `--paper`, `--ink`,
 * `--rule`, `--accent`, the four `--zone-*`, `--table-zebra`, `--focus`,
 * `--selection-bg`, `--scrollbar-thumb` and the rest — plus `color-scheme`. So a
 * write schedules a full-document style recalc even when the value it writes is the
 * value already there. `sync` runs on bind, on `astro:page-load` and on
 * `astro:after-swap`, so an unguarded write costs that recalc on every navigation.
 *
 * And the asymmetry is worth stating: `[data-theme='dark']` has no standalone block
 * at all, because dark IS the `:root` default. Writing `'dark'` re-asserts what is
 * already true and overrides nothing; writing `'light'` flips all 24 properties.
 * The guard earns most in the second direction — which is the direction a reader on
 * the default theme never takes, and so never notices the cost that was there.
 */
function setRootTheme(root, theme) {
  const next = normalizeTheme(theme);
  if (root?.dataset && root.dataset.theme !== next) {
    root.dataset.theme = next;
  }
}

function syncButtonState(documentRef, theme) {
  const button = documentRef?.querySelector?.('#theme-toggle');
  if (!button) {
    return;
  }
  const label = theme === DEFAULT_THEME ? 'Switch to light theme' : 'Switch to dark theme';
  if (button.getAttribute?.('aria-label') !== label) {
    button.setAttribute?.('aria-label', label);
  }
}

export function currentTheme(root) {
  return normalizeTheme(root?.dataset?.theme);
}

export function initializeTheme(root, storage) {
  const theme = readStoredTheme(getStorage(storage)) ?? DEFAULT_THEME;
  setRootTheme(root, theme);
  return theme;
}

function persistTheme(storage, theme) {
  try {
    getStorage(storage)?.setItem?.(THEME_STORAGE_KEY, theme);
    return true;
  } catch {
    return false;
  }
}

export function toggleTheme(root, storage) {
  const next = currentTheme(root) === DEFAULT_THEME ? LIGHT_THEME : DEFAULT_THEME;
  setRootTheme(root, next);
  persistTheme(storage, next);
  return next;
}

function getBindingRoot(documentRef, rootDependency, isDocument, dependencies) {
  if (!isDocument && dependencies.root) {
    return dependencies.root;
  }
  if (rootDependency && typeof rootDependency.querySelector === 'function') {
    return rootDependency;
  }
  return rootDependency ?? documentRef?.documentElement;
}

function getBindingStorage(dependencies, rootDependency, storageDependency, isDocument) {
  if (!isDocument && dependencies.storage !== undefined) {
    return dependencies.storage;
  }
  if (rootDependency && typeof rootDependency.getItem === 'function') {
    return rootDependency;
  }
  return storageDependency;
}

function getDocumentController(documentRef) {
  return documentRef?.[THEME_CONTROLLER_KEY] ?? null;
}

function setDocumentController(documentRef, controller) {
  try {
    documentRef[THEME_CONTROLLER_KEY] = controller;
  } catch {
    return false;
  }
  return true;
}

function createThemeController(documentRef, root, storage, initialTheme) {
  let activeTheme = normalizeTheme(initialTheme);
  const getRoot = () => documentRef?.documentElement ?? root;
  const sync = () => {
    setRootTheme(getRoot(), activeTheme);
    syncButtonState(documentRef, activeTheme);
  };
  const toggle = () => {
    activeTheme = toggleTheme(getRoot(), storage);
    sync();
  };
  const onClick = (event) => {
    const target = event?.target;
    const toggleTarget =
      typeof target?.closest === 'function' ? target.closest('#theme-toggle') : null;
    if (!toggleTarget) {
      return;
    }
    toggle();
  };

  const controller = { sync, toggle };
  setDocumentController(documentRef, controller);
  documentRef.addEventListener?.('click', onClick);
  documentRef.addEventListener?.('astro:page-load', sync);
  // after-swap fires before page-load; re-applying the theme there keeps the
  // swapped-in <html> from painting one frame with a stale data-theme.
  // Both listeners are kept and both are pinned by tests. The second sync is now
  // genuinely free: `setRootTheme` compares first, and the swapped-in <html>
  // carries the same `data-theme` the controller is already holding.
  documentRef.addEventListener?.('astro:after-swap', sync);

  return controller;
}

export function bindThemeController(dependencies = {}, rootDependency, storageDependency) {
  const isDocument = typeof dependencies?.querySelector === 'function';
  const documentRef = isDocument ? dependencies : (dependencies.document ?? globalThis.document);
  const root = getBindingRoot(documentRef, rootDependency, isDocument, dependencies);
  const storage = getBindingStorage(dependencies, rootDependency, storageDependency, isDocument);
  const emptyController = { sync() {}, toggle() {} };

  if (!documentRef || !root) {
    return emptyController;
  }

  const persistent = getDocumentController(documentRef);
  if (persistent) {
    return persistent;
  }

  let rootBindings = bindings.get(documentRef);
  if (!rootBindings) {
    rootBindings = new WeakMap();
    bindings.set(documentRef, rootBindings);
  }

  const existing = rootBindings.get(root);
  if (existing) {
    setDocumentController(documentRef, existing);
    return existing;
  }

  const activeTheme = initializeTheme(root, storage);
  const controller = createThemeController(documentRef, root, storage, activeTheme);
  rootBindings.set(root, controller);
  controller.sync();
  return controller;
}
