import { createTimerController, getTimerFunctions } from './route-loader-timer.mjs';

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

/*
 * Written through `setAttribute`, not `dataset`, on purpose.
 *
 * `element.dataset.visible = 'true'` and `element.setAttribute('data-visible',
 * 'true')` produce the same attribute in a browser, but only the second is
 * observable from a test double. The retired `loader.dataset` branch wrote to
 * whatever `dataset` happened to be — including the unit fixture's plain object
 * — so the suite asserted a property the CSS attribute selector could never see
 * and the skeleton stayed at `opacity-0` for a whole navigation. The
 * real-browser guarantee now lives in `test/e2e/route-loader.spec.mjs`.
 */
function setLoaderVisibility(loader, visible) {
  // oxlint-disable-next-line unicorn/prefer-dom-node-dataset -- see note above
  loader?.setAttribute?.('data-visible', String(visible));
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

function createNavigationFlags() {
  return { activeSignal: undefined, abortHandler: undefined, pending: false, prepared: false };
}

function createVisualSettler(state, timer, loader, busy) {
  return () => {
    removeAbortListener(state.activeSignal, state.abortHandler);
    state.activeSignal = undefined;
    state.abortHandler = undefined;
    state.pending = false;
    timer.clear();
    loader.hide();
    busy.clear();
  };
}

/*
 * `pending` and `prepared` are deliberately separate.
 *
 * `pending` gates the reveal, the busy mark and the safety cap, so it is
 * cleared the moment the navigation settles visually.
 *
 * `prepared` records that a client-side navigation was actually started, and is
 * the ONLY input to the focus handoff. It must survive `astro:before-swap`,
 * which fires and is handled BEFORE `astro:page-load` — collapsing the two into
 * one flag silently cancelled the handoff and left focus on the outgoing body
 * after every navigation.
 */
function createNavigationState(documentRef, timer, loader, busy) {
  const state = createNavigationFlags();
  const settleVisuals = createVisualSettler(state, timer, loader, busy);

  const cancel = () => {
    settleVisuals();
    state.prepared = false;
  };

  const beforePreparation = (signal) => {
    cancel();
    if (signal?.aborted) {
      return;
    }
    state.pending = true;
    state.prepared = true;
    state.activeSignal = signal;
    armAbortWatchdog(state, signal, settleVisuals);
    armRevealGates(state, { signal, timer, documentRef, loader, busy, cancel: settleVisuals });
  };

  const pageLoad = () => {
    const wasPrepared = state.prepared;
    state.prepared = false;
    const nextMain = getMain(documentRef);
    // Mark the INCOMING main so the busy state survives the swap, then clear it
    // so nothing is ever left announced.
    nextMain?.setAttribute?.('aria-busy', 'true');
    settleVisuals();
    nextMain?.removeAttribute?.('aria-busy');
    if (wasPrepared) {
      nextMain?.focus?.({ preventScroll: true });
    }
  };

  return {
    beforePreparation,
    /* Safety net. Hides the skeleton without discarding `prepared`, so the focus
       handoff in `pageLoad` still fires. */
    beforeSwap: settleVisuals,
    cancel,
    pageLoad,
  };
}

function isCurrentNavigation(state, signal) {
  return state.pending && state.activeSignal === signal;
}

function armAbortWatchdog(state, signal, cancel) {
  if (!signal) {
    return;
  }
  state.abortHandler = () => {
    if (isCurrentNavigation(state, signal)) {
      cancel();
    }
  };
  signal.addEventListener?.('abort', state.abortHandler, { once: true });
}

function armRevealGates(state, { signal, timer, documentRef, loader, busy, cancel }) {
  /*
   * `aria-busy` is set inside the reveal gate rather than synchronously, so a
   * fast cached navigation never produces a busy state with no visible
   * feedback. It lands on the OUTGOING `main`, which the router discards
   * milliseconds later; the incoming `main` is marked in `pageLoad`.
   */
  timer.schedule(() => {
    if (isCurrentNavigation(state, signal)) {
      busy.mark(getMain(documentRef));
      loader.show();
    }
  });
  // Hard ceiling — see LOADER_MAX_VISIBLE_MS in route-loader-timer.mjs.
  timer.scheduleCap(() => {
    if (isCurrentNavigation(state, signal)) {
      cancel();
    }
  });
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
