const LOADER_DELAY = 180;
const VISIBLE_ATTRIBUTE = 'data-visible';
const LOADING_MESSAGE = 'Loading requested page';

function getMain(documentRef) {
  return documentRef?.querySelector?.('main#main') ?? documentRef?.querySelector?.('main') ?? null;
}

function getLoader(documentRef) {
  return (
    documentRef?.querySelector?.('[data-route-loader]') ??
    documentRef?.querySelector?.('#route-loader') ??
    null
  );
}

function getLoaderMessage(documentRef) {
  return (
    getLoader(documentRef)?.querySelector?.('[data-route-loader-message]') ??
    documentRef?.querySelector?.('[data-route-loader-message]') ??
    null
  );
}

function getTimerFunctions(timer, windowRef, dependencies) {
  if (typeof timer?.setTimeout === 'function') {
    return {
      clearTimeout: timer.clearTimeout?.bind(timer),
      setTimeout: timer.setTimeout.bind(timer),
    };
  }

  if (typeof dependencies?.setTimeout === 'function') {
    return {
      clearTimeout: dependencies.clearTimeout?.bind(dependencies),
      setTimeout: dependencies.setTimeout.bind(dependencies),
    };
  }

  if (typeof windowRef?.setTimeout === 'function') {
    return {
      clearTimeout: windowRef.clearTimeout?.bind(windowRef),
      setTimeout: windowRef.setTimeout.bind(windowRef),
    };
  }

  return {
    clearTimeout: globalThis.clearTimeout?.bind(globalThis),
    setTimeout: globalThis.setTimeout.bind(globalThis),
  };
}

function createTimerController(timerFunctions) {
  let timerId;
  let timerScheduled = false;

  const clear = () => {
    if (timerScheduled) {
      timerFunctions.clearTimeout?.(timerId);
    }
    timerId = undefined;
    timerScheduled = false;
  };

  const schedule = (callback) => {
    clear();
    timerScheduled = true;
    const id = timerFunctions.setTimeout(() => {
      timerId = undefined;
      timerScheduled = false;
      callback();
    }, LOADER_DELAY);
    if (timerScheduled) {
      timerId = id;
    }
  };

  return { clear, schedule };
}

function setLoaderVisibility(loader, visible) {
  if (!loader) {
    return;
  }
  if (loader.dataset) {
    loader.dataset.visible = String(visible);
  } else {
    loader.setAttribute?.(VISIBLE_ATTRIBUTE, String(visible));
  }
}

function setLoaderMessage(documentRef, message) {
  const messageElement = getLoaderMessage(documentRef);
  if (messageElement) {
    messageElement.textContent = message;
  }
}

function createLoaderState(documentRef) {
  return {
    hide() {
      setLoaderVisibility(getLoader(documentRef), false);
      setLoaderMessage(documentRef, '');
    },
    show() {
      setLoaderVisibility(getLoader(documentRef), true);
      setLoaderMessage(documentRef, LOADING_MESSAGE);
    },
  };
}

function createBusyState(documentRef) {
  const busyMains = new Set();

  return {
    clear() {
      for (const main of busyMains) {
        main.removeAttribute?.('aria-busy');
      }
      busyMains.clear();
      getMain(documentRef)?.removeAttribute?.('aria-busy');
    },
    mark(main) {
      if (!main) {
        return;
      }
      main.setAttribute?.('aria-busy', 'true');
      busyMains.add(main);
    },
  };
}

function removeAbortListener(signal, handler) {
  if (signal && handler) {
    signal.removeEventListener?.('abort', handler);
  }
}

export function wrapRouteLoader(loader, cancel, isDefaultPrevented = () => false) {
  return async function wrappedRouteLoader(...args) {
    try {
      const result = await loader.apply(this, args);
      if (isDefaultPrevented()) {
        cancel();
      }
      return result;
    } catch (error) {
      cancel();
      throw error;
    }
  };
}

function createNavigationState(documentRef, timer, loader, busy) {
  let activeSignal;
  let abortHandler;
  let navigationPending = false;

  const cancel = () => {
    removeAbortListener(activeSignal, abortHandler);
    activeSignal = undefined;
    abortHandler = undefined;
    navigationPending = false;
    timer.clear();
    loader.hide();
    busy.clear();
  };

  return {
    beforePreparation(signal) {
      cancel();
      if (signal?.aborted) {
        return;
      }

      navigationPending = true;
      activeSignal = signal;
      if (signal) {
        abortHandler = () => {
          if (activeSignal === signal) {
            cancel();
          }
        };
        signal.addEventListener?.('abort', abortHandler, { once: true });
      }

      busy.mark(getMain(documentRef));
      timer.schedule(() => {
        if (navigationPending && activeSignal === signal) {
          loader.show();
        }
      });
    },
    cancel,
    pageLoad() {
      const wasPending = navigationPending;
      cancel();
      if (wasPending) {
        getMain(documentRef)?.focus?.({ preventScroll: true });
      }
    },
  };
}

export function createRouteLoaderController(dependencies = {}, windowDependency, timerDependency) {
  const isDocument = typeof dependencies?.querySelector === 'function';
  const documentRef = isDocument ? dependencies : (dependencies.document ?? globalThis.document);
  const windowRef = isDocument
    ? (windowDependency ?? dependencies.defaultView)
    : (dependencies.window ?? documentRef?.defaultView);
  const timer = isDocument
    ? timerDependency
    : (dependencies.timers ?? dependencies.timer ?? windowDependency);
  const timerFunctions = getTimerFunctions(timer, windowRef, dependencies);
  const timerController = createTimerController(timerFunctions);
  const loader = createLoaderState(documentRef);
  const busy = createBusyState(documentRef);
  return createNavigationState(documentRef, timerController, loader, busy);
}
