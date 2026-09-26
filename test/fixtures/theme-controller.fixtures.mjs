export function createStorage(initial = {}) {
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

  return storage;
}

export class FakeElement {
  constructor({ id = '', dataset = {}, attributes = {}, closest = null } = {}) {
    this.id = id;
    this.dataset = { ...dataset };
    this.attributes = new Map(Object.entries(attributes));
    this.closestResult = closest;
    this.listeners = new Map();
  }

  getAttribute(name) {
    if (name === 'data-theme') {
      return this.dataset.theme ?? null;
    }
    if (name === 'data-theme-icon') {
      return this.dataset.themeIcon ?? null;
    }
    if (name === 'data-active') {
      return this.dataset.active ?? null;
    }
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name, value) {
    const stringValue = String(value);
    this.attributes.set(name, stringValue);
    if (name === 'data-theme') {
      this.dataset.theme = stringValue;
    }
    if (name === 'data-theme-icon') {
      this.dataset.themeIcon = stringValue;
    }
  }

  removeAttribute(name) {
    this.attributes.delete(name);
    if (name === 'data-theme') {
      delete this.dataset.theme;
    }
    if (name === 'data-theme-icon') {
      delete this.dataset.themeIcon;
    }
  }

  closest(selector) {
    if (selector === '#theme-toggle') {
      return this.closestResult ?? (this.id === 'theme-toggle' ? this : null);
    }
    return null;
  }

  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) ?? [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }
}

export function createHarness({ storedTheme, rootTheme = 'dark', icons } = {}) {
  const root = new FakeElement({ dataset: { theme: rootTheme } });
  const storage = createStorage(storedTheme === undefined ? {} : { theme: storedTheme });
  const darkIcon = new FakeElement({ dataset: { themeIcon: 'dark' } });
  const lightIcon = new FakeElement({ dataset: { themeIcon: 'light' } });
  const toggle = new FakeElement({
    id: 'theme-toggle',
    attributes: { 'aria-label': 'Switch to light theme' },
  });
  const document = {
    documentElement: root,
    icons: icons ?? [darkIcon, lightIcon],
    listeners: new Map(),
    querySelector(selector) {
      if (selector === 'documentElement') {
        return this.documentElement;
      }
      if (selector === '#theme-toggle') {
        return this.toggle;
      }
      return null;
    },
    querySelectorAll(selector) {
      return selector === '[data-theme-icon]' ? this.icons : [];
    },
    addEventListener(type, handler) {
      const handlers = this.listeners.get(type) ?? [];
      handlers.push(handler);
      this.listeners.set(type, handlers);
    },
    dispatch(type, event = {}) {
      for (const handler of this.listeners.get(type) ?? []) {
        handler(event);
      }
    },
    listenerCount(type) {
      return (this.listeners.get(type) ?? []).length;
    },
    toggle,
  };

  return { darkIcon, document, lightIcon, root, storage, toggle };
}

export function withLocalStorage(storage, callback) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  try {
    return callback();
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, 'localStorage', descriptor);
    } else {
      Reflect.deleteProperty(globalThis, 'localStorage');
    }
  }
}
